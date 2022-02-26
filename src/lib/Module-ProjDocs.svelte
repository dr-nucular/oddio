<script>
	import { onDestroy } from 'svelte';
	import { readProject, updateProject, queryContent, cloneContent, readContent, updateContent, deleteContent } from '../firebase.js';
	import { sAuthInfo, sModules, sCurProject, sProjDocs, sActiveProjDocs, gProjDocProps } from '../stores.js';

	// exported attributes
	export let collectionStr = "";

	// subscription vars
	let authInfo = {};
	let modules = {};
	let curProject = null;
	let projDocs = []; // just those of type collectionStr
	let activeProjDoc = null; // just that of type collectionStr

	// other states
	let editingDocId;
	let editingDocData;
	let docSaveButton;
	let docDeleteButton;

	const shouldRequestDocuments = () => {
		return !!(authInfo.isLoggedIn && curProject !== null && !projDocs.length);
	};

	const requestDocuments = async () => {
		const data = await queryContent(collectionStr, curProject?.id);
		sProjDocs.update(collections => {
			collections[collectionStr] = data;
			return collections;
		});
	};


	// store subscriptions
	const unsubAuthInfo = sAuthInfo.subscribe(obj => authInfo = obj);
	const unsubModules = sModules.subscribe(obj => modules = obj);
	$: cssVarStyles = `--bgColor:${modules[collectionStr]?.bgColor}`;
	const unsubProjDocs = sProjDocs.subscribe(collections => projDocs = collections[collectionStr]);
	const unsubActiveProjDocs = sActiveProjDocs.subscribe(collections => activeProjDoc = collections[collectionStr]);
	const unsubCurProject = sCurProject.subscribe(obj => {
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
		data[gProjDocProps[collectionStr]?.projRefField] = `/${collectionStr}/${documentId}`;
		await updateProject(curProject.id, data);
		
		// update sCurProject in store
		const updatedProject = await readProject(curProject.id);
		sCurProject.set(updatedProject);
	};

	const editDocument = (documentId) => {
		const editingDoc = projDocs.find(item => item.id === documentId);
		editingDocId = editingDoc.id;
		editingDocData = editingDoc.data();
	};
	const closeDocEditor = () => {
		editingDocId = undefined;
		editingDocData = undefined;
	};
	const saveOrDeleteDocument = async (event) => {
		if (event.submitter === docSaveButton) {
			await saveDocument();
		} else {
			await deleteDocument();
		}
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

			docSaveButton.innerText = "Saving...";
			docSaveButton.disabled = true;
			await updateContent(collectionStr, docId.value, { name, configJson });
			closeDocEditor();
			requestDocuments();

			// if this edited item is also the active one, then we need to update that data in the store
			const updatedContent = await readContent(collectionStr, docId.value);
			if (activeProjDoc.id === updatedContent.id) {
				sActiveProjDocs.update(collections => {
					collections[collectionStr] = updatedContent;
					return collections;
				});
			}
		} catch (err) {
			console.error(`saveDocument ERROR: ${err}`);
		}
	};
	const deleteDocument = async () => {
		try {
			if (!docId?.value) {
				throw `docId not present`;
			}
			if (docDeleteButton.innerText !== "Delete 4 Realz?") {
				docDeleteButton.innerText = "Delete 4 Realz?";
			} else {
				docDeleteButton.innerText = "Deleting...";
				docDeleteButton.disabled = true;
				await deleteContent(collectionStr, docId.value);
				closeDocEditor();
				requestDocuments();
			}
		} catch (err) {
			console.error(`deleteDocument ERROR: ${err}`);
		}
	};

	const cloneDocument = async (documentId) => {
		await cloneContent(collectionStr, documentId);
		requestDocuments();
	};

	onDestroy(() => {
		unsubAuthInfo();
		unsubModules();
		unsubProjDocs();
		unsubActiveProjDocs();
		unsubCurProject();
	});

</script>

<div
	style={cssVarStyles}
	class="content-module">
	<h2>&starf;&nbsp; {gProjDocProps[collectionStr]?.plural} &nbsp;&starf;</h2><hr/>
	{#if authInfo.isLoggedIn}
		Active Project: <b>{curProject?.data().name}</b> using:
		<ul>
			<li>{gProjDocProps[collectionStr]?.singular}: <b>{activeProjDoc?.data().name}</b></li>
		</ul>

		All {gProjDocProps[collectionStr]?.plural}:
		<ol>
			{#each projDocs as document}
				<li>
					<b>{document.data().name}</b>
					<small>[id: {document.id}]</small>
					&Pr; <a href={null} on:click={activateDocument(document.id)}>Activate</a>
					&squf; <a href={null} on:click={editDocument(document.id)}>Edit</a>
					&squf; <a href={null} on:click={cloneDocument(document.id)}>Clone</a>
					&Sc;
				</li>
			{/each}
		</ol>

		{#if editingDocId}
			<form on:submit|preventDefault={saveOrDeleteDocument}>
				<input id="docId" type="text" bind:value={editingDocId} />
				<label for="docName">Name:</label>
				<input id="docName" type="text" bind:value={editingDocData.name} /><br/>
				<label for="docConfigJson">JSON:</label>
				<textarea id="docConfigJson" bind:value={editingDocData.configJson} /><br/>
				<button id="docSaveButton" type="submit" bind:this={docSaveButton}>Save</button>
				&nbsp;
				<a href={null} on:click={closeDocEditor}>Abort Editing</a>
				{#if activeProjDoc.id !== editingDocId}
					<button id="docDeleteButton" type="submit" bind:this={docDeleteButton}>Delete</button>
				{/if}
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
	input {
		width: 100%;
	}
	textarea {
		width: 100%;
		height: 100px;
	}
	#docId {
		display: none;
	}
	#docDeleteButton {
		float: right;
		color: red;
	}
	#docDeleteButton:disabled {
		color: #999;
		pointer-events: none;
	}

</style>