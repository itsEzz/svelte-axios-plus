<script lang="ts">
	import { resolve } from '$app/paths';
	import axiosPlus from '$lib/index.svelte.js';

	const { req, refetch } = axiosPlus('https://reqres.in/api/users?delay=1');
</script>

<h1>Quickstart example</h1>
<a href={resolve('/')}>Back to TOC</a>

{#if req.loading}
	<p>Loading...</p>
{:else if req.error}
	<p>Error!</p>
{/if}
<div>
	<button onclick={() => refetch()}>Refetch</button>
	<pre>{JSON.stringify(req.data, null, 2)}</pre>
</div>
