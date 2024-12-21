<script lang="ts">
	import axios from 'axios';
	import { makeAxiosPlus } from '$lib/index.svelte.js';

	const customAxiosPlus = makeAxiosPlus({
		axios: axios.create({ baseURL: 'https://reqres.in/api' })
	});

	const { req, refetch } = customAxiosPlus('/users?delay=1');
</script>

<h1>Multiple hook instances example</h1>
<a href="/">Back to TOC</a>

{#if req.loading}
	<p>Loading...</p>
{/if}
{#if req.error}
	<p>Error!</p>
{/if}

<div>
	<button onclick={() => refetch()}>Refetch</button>
	<pre>{JSON.stringify(req.data, null, 2)}</pre>
</div>
