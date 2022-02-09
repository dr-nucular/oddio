<script>
	import { onDestroy } from 'svelte';
	import { queryProjects, readProject, createProject, cloneProject, updateProject, deleteProject, readContent } from '../firebase.js';
	import { sAuthInfo, sModules, sProjects, sCurProject, sActiveProjDocs, gProjDocProps } from '../stores.js';

	// subscription vars
	let authInfo = {};
	let modules = {};
	let projects = [];
	let curProject = null;
	let activeProjDocs = {};

	// other states
	let editingDocId;
	let editingDocData;
	let docSaveButton;
	let docDeleteButton;


	const shouldRequestProjects = () => {
		return !!(authInfo.isLoggedIn & !projects.length);
	};

	const requestProjects = async () => {
		const data = await queryProjects();
		sProjects.set(data);
		// to start, save first one to sCurProject
		if (!curProject && data.length) {
			sCurProject.set(data[0]);
		}
	};


	// subscriptions
	const unsubAuthInfo = sAuthInfo.subscribe(obj => authInfo = obj);
	const unsubModules = sModules.subscribe(obj => modules = obj);
	$: cssVarStyles = `--bgColor:${modules.projects?.bgColor}`;
	const unsubProjects = sProjects.subscribe(objs => projects = objs);
	const unsubCurProject = sCurProject.subscribe(async obj => {
		curProject = obj;
		if (curProject) {
			const curSoundSetId = curProject.data().soundSet?.id || null;
			if (curSoundSetId) {
				activeProjDocs.soundSets = await readContent('soundSets', curSoundSetId);				
			} else {
				activeProjDocs.soundSets = null;
			}

			const curGraphId = curProject.data().graph?.id || null;
			if (curGraphId) {
				activeProjDocs.graphs = await readContent('graphs', curGraphId);			
			} else {
				activeProjDocs.graphs = null;
			}

			const curCompositionId = curProject.data().composition?.id || null;
			if (curCompositionId) {
				activeProjDocs.compositions = await readContent('compositions', curCompositionId);			
			} else {
				activeProjDocs.compositions = null;
			}

			sActiveProjDocs.set(activeProjDocs); // ?
		}
	});
	const unsubActiveProjDocs = sActiveProjDocs.subscribe(collections => activeProjDocs = collections);



	if (shouldRequestProjects()) {
		requestProjects();
	}
	



	const activateDocument = async (documentId) => {
		const activatedProject = await readProject(documentId);
		sCurProject.set(activatedProject);
	};

	const editDocument = (documentId) => {
		const editingDoc = projects.find(item => item.id === documentId);
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
			*/
			if (!docId?.value) {
				throw `docId not present`;
			}
			if (!docName?.value) {
				throw `docName must be set`;
			}

			const name = docName.value.trim();

			docSaveButton.innerText = "Saving...";
			docSaveButton.disabled = true;
			await updateProject(docId.value, { name });
			closeDocEditor();
			requestProjects();

			// if this edited item is also the active one, then we need to update that data in the store
			const updatedProject = await readProject(docId.value);
			if (curProject.id === updatedProject.id) {
				sCurProject.set(updatedProject);
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
				await deleteProject(docId.value);
				closeDocEditor();
				requestProjects();
			}
		} catch (err) {
			console.error(`deleteDocument ERROR: ${err}`);
		}
	};

	const cloneDocument = async (documentId) => {
		await cloneProject(documentId);
		requestProjects();
	};

	onDestroy(() => {
		unsubAuthInfo();
		unsubModules();
		unsubProjects();
		unsubCurProject();
		unsubActiveProjDocs();
	});

</script>

<div
	style={cssVarStyles}
	class="content-module">
	<h2>&starf;&nbsp; Projects &nbsp;&starf;</h2><hr/>
	{#if authInfo.isLoggedIn}
		Active Project: <b>{curProject?.data().name}</b> using:
		<ul>
			<li>{gProjDocProps.soundSets.singular}: <b>{activeProjDocs?.soundSets?.data().name}</b></li>
			<li>{gProjDocProps.graphs.singular}: <b>{activeProjDocs?.graphs?.data().name}</b></li>
			<li>{gProjDocProps.compositions.singular}: <b>{activeProjDocs?.compositions?.data().name}</b></li>
		</ul>

		All Projects:
		<ol>
			{#each projects as project}
				<li>
					<b>{project.data().name}</b>
					<small>[id: {project.id}]</small>
					&Pr; <a href={null} on:click={activateDocument(project.id)}>Activate</a>
					&squf; <a href={null} on:click={editDocument(project.id)}>Edit</a>
					&squf; <a href={null} on:click={cloneDocument(project.id)}>Clone</a>
					&Sc;
				</li>
			{/each}
		</ol>

		{#if editingDocId}
			<form on:submit|preventDefault={saveOrDeleteDocument}>
				<input id="docId" type="text" bind:value={editingDocId} />
				<label for="docName">Name:</label>
				<input id="docName" type="text" bind:value={editingDocData.name} /><br/>
				<button id="docSaveButton" type="submit" bind:this={docSaveButton}>Save</button>
				&nbsp;
				<a href={null} on:click={closeDocEditor}>Abort Editing</a>
				{#if curProject?.id !== editingDocId}
					<button id="docDeleteButton" type="submit" bind:this={docDeleteButton}>Delete</button>
				{/if}
			</form>
		{/if}
	{/if}

	<!--Public projects:-->
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