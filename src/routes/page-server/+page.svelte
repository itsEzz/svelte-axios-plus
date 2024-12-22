<script lang="ts">
	interface Props {
		data: {
			rdata: any;
			error: string;
		};
	}

	let { data }: Props = $props();
</script>

<h1>Page.server example</h1>
<a href="/">Back to TOC</a>

<pre>Data: {JSON.stringify(data.rdata, null, 2)}</pre>
<p>Error: {data.error}</p>
