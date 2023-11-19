<script lang="ts">
	import axiosPlus from '$lib/index.js';

	const [{ loading, data, error }, refetch, cancel] = axiosPlus(
		'https://reqres.in/api/users?delay=1'
	);
</script>

{#if $loading}
	<p>Loading...</p>
{:else if $error}
	<p>Error!</p>
{/if}
<div>
	<button on:click={() => refetch()}>Refetch</button>
	<pre>{JSON.stringify($data, null, 2)}</pre>
</div>
