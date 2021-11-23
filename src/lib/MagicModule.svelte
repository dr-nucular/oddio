<script>

	import { uiDetails } from '../stores.js';

	export let text = "button";
	export let color = "#123456";
	export let moduleName = "nonExistantModule";
	export let visible = false;

	$: cssVarStyles = `--color:${color}`;

	const setModuleAppearance = (name, viz, bgColor) => {
		visible = !!viz;
		uiDetails[name] = { visible, bgColor };
		uiDetails.set(uiDetails);
		console.log(`*** setModuleAppearance ${name}: ${visible}, ${bgColor}`);
	};

	const toggleModule = (name) => {
		setModuleAppearance(name, !visible, color);
	};

	visible && setModuleAppearance(moduleName, visible, color);
	

</script>


<div class="content-module">
	style={cssVarStyles}
	class:selected={visible}
	on:click={toggleModule(moduleName)}>
	{text}
</div>


<style>

div.content-module {
	background:
		linear-gradient(to top, rgba(255,255,255,0.15) 0%, rgba(127,127,127,0.15) 100%),
		var(--color);
	padding: 15px;
	margin: 0 0 20px 0;
}

</style>
