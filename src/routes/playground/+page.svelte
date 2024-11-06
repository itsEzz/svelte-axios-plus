<script lang="ts">
	import axiosPlus, { clearCache } from '$lib/index.js';
	import { isAxiosError, isCancel } from 'axios';

	let manual: boolean = true;
	let autoCancel: boolean = true;
	let useCache: boolean = true;

	$: [{ loading, data, error, response }, refetch, cancel, reset] = axiosPlus(
		'https://reqres.in/api/users?delay=1',
		{ manual, autoCancel, useCache }
	);

	$: if ($response) console.log('Raw response', $response);

	async function execRefetch() {
		try {
			await refetch(undefined, { useCache });
		} catch (error) {
			if (isAxiosError(error) && isCancel(error)) {
				console.log('Request has been canceled');
				return;
			}
			console.error(error);
		}
	}
</script>

<h1>Playground example</h1>
<a href="/">Back to TOC</a>
<br />
<input type="checkbox" id="manual" name="manual" bind:checked={manual} />
<label for="manual"> Manual request</label><br />
<input type="checkbox" id="autoCancel" name="autoCancel" bind:checked={autoCancel} />
<label for="autoCancel"> Auto cancel request</label><br />
<input type="checkbox" id="useCache" name="useCache" bind:checked={useCache} />
<label for="useCache"> Use cache</label><br />

<button on:click={() => execRefetch()}>Execute request (refetch)</button>
<button on:click={() => cancel()} disabled={!$loading}>Cancel request</button>
<button on:click={() => reset()} disabled={$loading}>Reset state</button>
<button on:click={() => clearCache()} disabled={$loading}>Clear cache</button>

<p><u>Request loading</u>: {$loading}</p>
<p><u>Error</u>:</p>
<pre>{JSON.stringify($error, null, 2)}</pre>
<p><u>Data</u>:</p>
<pre>{JSON.stringify($data, null, 2)}</pre>
