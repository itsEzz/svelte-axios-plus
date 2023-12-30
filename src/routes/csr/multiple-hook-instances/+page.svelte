<script lang="ts">
	import axios from 'axios';
	import { makeAxiosPlus } from '$lib/index.js';

	const axiosPlus = makeAxiosPlus({
		axios: axios.create({ baseURL: 'https://reqres.in/api' })
	});

	const [{ data, loading, error }, refetch] = axiosPlus('/users?delay=1');
</script>

<h1>CSR multiple hook instances example</h1>
<a href="/">Back to TOC</a>

{#if $loading}
	<p>Loading...</p>
{/if}
{#if $error}
	<p>Error!</p>
{/if}

<div>
	<button on:click={() => refetch()}>Refetch</button>
	<pre>{JSON.stringify($data, null, 2)}</pre>
</div>
