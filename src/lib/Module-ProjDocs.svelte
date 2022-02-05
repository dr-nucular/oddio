<script>
	import { queryContent, cloneContent, readProject, readContent, updateProject, updateContent } from '../firebase.js';
	import { sAuthInfo, sModules, sCurProject, sProjDocs, sProjDocProps, sActiveProjDocs } from '../stores.js';

	export let collectionStr = "";

	let isLoggedIn = false;
	let modules = {};
	let curProject = null;
	let projDocProps = null; // i.e. { projRefField: "soundSet", singular: "Sound Set", plural: "Sound Sets" }
	let documents = [];
	let curDocument = null;

	let editingDocument = null;
	let editSubmitButton;

	const shouldRequestDocuments = () => {
		return !!(isLoggedIn && curProject !== null && !documents.length);
	};

	const requestDocuments = async () => {
		const data = await queryContent(collectionStr, curProject?.id);
		sProjDocs.update(collections => {
			collections[collectionStr] = data;
			return collections;
		});
	};



	sAuthInfo.subscribe(obj => isLoggedIn = obj.isLoggedIn);

	sModules.subscribe(obj => modules = obj);
	$: cssVarStyles = `--bgColor:${modules[collectionStr]?.bgColor}`;

	sProjDocProps.subscribe(collections => projDocProps = collections[collectionStr]);
	sProjDocs.subscribe(collections => documents = collections[collectionStr]);
	sActiveProjDocs.subscribe(collections => curDocument = collections[collectionStr]);
	sCurProject.subscribe(obj => {
		curProject = obj;
		//if (shouldRequestDocuments()) {
			requestDocuments();
		//}
	});

	/*
	if (shouldRequestDocuments()) {
		requestDocuments();
	}
	*/

	const activateDocument = async (documentId) => {
		const data = {};
		data[projDocProps.projRefField] = `/${collectionStr}/${documentId}`;
		await updateProject(curProject.id, data);
		
		// update sCurProject in store
		const updatedProject = await readProject(curProject.id);
		sCurProject.set(updatedProject);
	};

	const editDocument = (documentId) => {
		editingDocument = documents.find(item => item.id === documentId);
	};
	const closeDocEditor = () => {
		editingDocument = null;
	};
	const saveDocument = async () => {
		try {
			/*
			console.log(`.... docId: ${docId.value}`);
			console.log(`.... docName: ${docName.value}`);
			console.log(`.... docConfigJson: ${docConfigJson.value}`);
			*/
			if (!docId?.value) {
				throw `docId not present`;
			}
			if (!docName?.value) {
				throw `docName must be set`;
			}
			if (!docConfigJson?.value) {
				throw `docConfigJson must be set to some valid JSON`;
			}

			const name = docName.value.trim();
			const configJsonParsed = JSON.parse(docConfigJson.value); // will throw exception if can't be parsed
			//const configJson = JSON.stringify(configJsonParsed, null, 2); // make a button for tidying json?
			const configJson = docConfigJson.value;
			editSubmitButton.disabled = true;

			await updateContent(collectionStr, docId.value, { name, configJson });
			closeDocEditor();
			requestDocuments();

			// if this edited item is also the active one, then we need to update that data in the store
			const updatedContent = await readContent(collectionStr, docId.value);
			if (curDocument.id === updatedContent.id) {
				sActiveProjDocs.update(collections => {
					collections[collectionStr] = updatedContent;
					return collections;
				});
			}
		} catch (err) {
			console.error(`saveDocument ERROR: ${err}`);
		}
	};

	const cloneDocument = async (documentId) => {
		await cloneContent(collectionStr, documentId);
		requestDocuments();
	};

</script>

<div
	style={cssVarStyles}
	class="content-module">
	<h2>&starf;&nbsp; {projDocProps?.plural} &nbsp;&starf;</h2><hr/>
	{#if isLoggedIn}
		For Project: <b>{curProject?.data?.name}</b> [id: {curProject?.id}]
		<br/><br/>

		Active {projDocProps?.singular}: <b>{curDocument?.data?.name}</b> [id: {curDocument?.id}]
		<br/><br/>

		My {projDocProps?.plural}:
		<ol>
			{#each documents as document, ss}
				<li>
					<b>{document.data?.name}</b>
					<small>[id: {document.id}]</small>
					&Pr; <a href={null} on:click={activateDocument(document.id)}>Activate</a>
					&squf; <a href={null} on:click={editDocument(document.id)}>Edit</a>
					&squf; <a href={null} on:click={cloneDocument(document.id)}>Clone</a>
					&Sc;
				</li>
			{/each}
		</ol>

		{#if editingDocument}
			<form on:submit|preventDefault={saveDocument}>
				<input id="docId" type="text" bind:value={editingDocument.id} />
				<label for="docName">Name:</label>
				<input id="docName" type="text" bind:value={editingDocument.data.name} /><br/>
				<label for="docConfigJson">JSON:</label>
				<textarea id="docConfigJson" bind:value={editingDocument.data.configJson} /><br/>
				<button id="docSubmitButton" type="submit" bind:this={editSubmitButton}>Save</button>
				&nbsp;
				<a href={null} on:click={closeDocEditor}>Cancel</a>
			</form>
		{/if}
	{/if}
</div>

<style>
	div.content-module {
		background:
			linear-gradient(to top, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.5) 100%),
			var(--bgColor);
	}
	h2 {
		margin: 0 0 12px;
	}
	a {
		cursor: pointer;
	}
	#docId {
		display: none;
	}
	input {
		width: 100%;
	}
	textarea {
		width: 100%;
		height: 100px;
	}
</style>