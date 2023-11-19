<script lang="ts">
	import { writable, type Writable } from 'svelte/store';
	import axiosPlus from '$lib/index.js';

	const pagination: Writable<Record<string, number>> = writable({});
	$: [{ data, loading }, refetch, cancelRequest] = axiosPlus({
		url: 'https://reqres.in/api/users?delay=5',
		params: $pagination
	});

	const handleFetch = () => {
		pagination.set({ per_page: 2, page: 2 });
	};

	const externalRefetch = async () => {
		try {
			await refetch();
		} catch (e) {
			// Handle cancellation
		}
	};
</script>

<div>
	<button on:click={() => handleFetch()}>Refetch</button>
	<button on:click={() => externalRefetch()}>External Refetch</button>
	<button disabled={!$loading} on:click={() => cancelRequest()}>Cancel Request</button>
	{#if $loading}
		<p>...loading</p>
	{/if}
	<pre>{JSON.stringify($data, null, 2)}</pre>
</div>
