<script lang="ts">
	import axiosPlus from '$lib/index.js';

	const [{ data: getData, loading: getLoading, error: getError }] = axiosPlus(
		'https://reqres.in/api/users/1'
	);

	const [{ data: putData, loading: putLoading, error: putError }, executePut] = axiosPlus(
		{
			url: 'https://reqres.in/api/users/1',
			method: 'PUT'
		},
		{ manual: true }
	);

	function updateData() {
		executePut({
			data: {
				...$getData,
				updatedAt: new Date().toISOString()
			}
		});
	}
</script>

<h1>CSR manual requests example</h1>
<a href="/">Back to TOC</a>

{#if $getLoading || $putLoading}
	<p>Loading...</p>
{/if}
{#if $getError || $putError}
	<p>Error!</p>
{/if}

<div>
	<button on:click={() => updateData()}>Update data</button>
	<pre>{JSON.stringify($putData || $getData, null, 2)}</pre>
</div>
