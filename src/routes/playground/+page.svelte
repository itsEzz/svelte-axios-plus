<script lang="ts">
	import axiosPlus, { clearCache, type AxiosPlusOptions } from '$lib/index.svelte.js';
	import { isAxiosError, isCancel } from 'axios';

	let options: AxiosPlusOptions = $state({
		manual: true,
		autoCancel: true,
		useCache: true
	});
	let force: boolean = $state(false);

	let { req, refetch, cancel, reset } = axiosPlus('https://reqres.in/api/users?delay=1', options);

	async function execRefetch() {
		try {
			await refetch(undefined, { useCache: options.useCache });
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
<input type="checkbox" id="manual" name="manual" bind:checked={options.manual} />
<label for="manual"> Manual request</label><br />
<input type="checkbox" id="autoCancel" name="autoCancel" bind:checked={options.autoCancel} />
<label for="autoCancel"> Auto cancel request</label><br />
<input type="checkbox" id="useCache" name="useCache" bind:checked={options.useCache} />
<label for="useCache"> Use cache</label><br />
<input type="checkbox" id="force" name="force" bind:checked={force} />
<label for="useCache"> Force reset state</label><br />

<button onclick={() => execRefetch()}>Execute request (refetch)</button>
<button onclick={() => cancel()} disabled={!req.loading}>Cancel request</button>
<button onclick={() => reset(force)}>Reset state</button>
<button onclick={() => clearCache()} disabled={req.loading}>Clear cache</button>

<p><u>Request loading</u>: {req.loading}</p>
<p><u>Error</u>:</p>
<pre>{JSON.stringify(req.error, null, 2)}</pre>
<p><u>Data</u>:</p>
<pre>{JSON.stringify(req.data, null, 2)}</pre>
