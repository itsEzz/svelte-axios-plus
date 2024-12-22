<script lang="ts">
	import axiosPlus from '$lib/index.svelte.js';

	let pagination: Record<string, number> = $state({ per_page: 6, page: 1 });
	const { req, refetch, cancel } = $derived(
		axiosPlus({
			url: 'https://reqres.in/api/users?delay=5',
			params: pagination
		})
	);

	function handleFetch() {
		pagination = { ...pagination, page: pagination.page + 1 };
	}

	async function externalRefetch() {
		try {
			await refetch();
		} catch (e) {
			// Handle errors
		}
	}
</script>

<h1>Manual cancellation example</h1>
<a href="/">Back to TOC</a>

<div>
	<button onclick={handleFetch}>Refetch</button>
	<button onclick={externalRefetch}>External Refetch</button>
	<button disabled={!req.loading} onclick={cancel}>Cancel Request</button>
	{#if req.loading}
		<p>...loading</p>
	{/if}
	<pre>{JSON.stringify(req.data, null, 2)}</pre>
</div>
