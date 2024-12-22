<script lang="ts">
	import axiosPlus from '$lib/index.svelte.js';

	const { req: getReq } = axiosPlus('https://reqres.in/api/users/1');

	const { req: putReq, refetch } = axiosPlus(
		{
			url: 'https://reqres.in/api/users/1',
			method: 'PUT'
		},
		{ manual: true }
	);

	async function updateData() {
		try {
			await refetch({
				data: {
					...getReq.data,
					updatedAt: new Date().toISOString()
				}
			});
		} catch (error) {
			// Handle errors
		}
	}
</script>

<h1>Manual requests example</h1>
<a href="/">Back to TOC</a>

{#if getReq.loading || putReq.loading}
	<p>Loading...</p>
{/if}
{#if getReq.error || putReq.error}
	<p>Error!</p>
{/if}

<div>
	<button onclick={updateData}>Update data</button>
	<pre>{JSON.stringify(putReq.data || getReq.data, null, 2)}</pre>
</div>
