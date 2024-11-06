<script lang="ts">
	import axiosPlus from '$lib/index.js';

	let pagination: Record<string, number> = { per_page: 6, page: 1 };
	$: [{ data, loading }, refetch, cancelRequest] = axiosPlus({
		url: 'https://reqres.in/api/users?delay=5',
		params: pagination
	});

	const handleFetch = () => {
		pagination = { ...pagination, page: pagination.page + 1 };
	};

	const externalRefetch = async () => {
		try {
			await refetch();
		} catch (e) {
			// Handle cancellation
		}
	};
</script>

<h1>Manual cancellation example</h1>
<a href="/">Back to TOC</a>

<div>
	<button on:click={() => handleFetch()}>Refetch</button>
	<button on:click={() => externalRefetch()}>External Refetch</button>
	<button disabled={!$loading} on:click={() => cancelRequest()}>Cancel Request</button>
	{#if $loading}
		<p>...loading</p>
	{/if}
	<pre>{JSON.stringify($data, null, 2)}</pre>
</div>
