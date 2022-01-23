<script>
	import Oddio from '$lib/Oddio.js';
	import { sModules, audioContextData } from '../stores.js';

	export let text = "button";
	export let color = "#123456";
	export let moduleName = "nonExistantModule";
	export let visible = false;
	export let disabled = false;

	// https://svelte.dev/repl/8123d474edb04f198c3b83363716a709?version=3.43.0
	$: cssVarStyles = `--color:${color}`;

	// user gesture required to start audioContext, so, attaching to MagicButton tap.
	// There should be a better way, maybe?
	const initAC = async () => {
		const ac = Oddio.getAC();
		if (!ac) {
			return Oddio.init().then(() => {
				const acState = Oddio.getAC()?.state;
				console.log(`MagicButton.initAC(): Initialized audio subsystem, state: ${acState}`);
				audioContextData.state = acState;
				audioContextData.set(audioContextData);
			}).catch(() => {
				console.log(`MagicButton.initAC(): Failed to initialize audio subsystem`);
			});
		}
		return;
	};

	const setModuleAppearance = (name, viz, bgColor) => {
		visible = !!viz;
		sModules[name] = { visible, bgColor };
		sModules.set(sModules);
		console.log(`MagicButton.setModuleAppearance(${name}, ${visible}, ${bgColor})`);
	};

	const toggleModule = (name) => {
		setModuleAppearance(name, !visible, color);
		initAC();
	};

	visible && setModuleAppearance(moduleName, visible, color);
</script>


<button
	style={cssVarStyles}
	class:selected={visible}
	disabled={disabled}
	on:click={toggleModule(moduleName)}>
	{text}
</button>


<style>
button.selected {
	background:
		linear-gradient(to bottom, rgba(255,255,255,0.25) 0%, rgba(127,127,127,0.25) 100%),
		var(--color);
}
button.selected:hover {
	background:
		linear-gradient(to top, rgba(255,255,255,0.25) 0%, rgba(127,127,127,0.25) 100%),
		var(--color);
}
</style>
