<script lang="ts">
	interface Props {
		data: any;
	}

	let { data }: Props = $props();
</script>

<h1>Page example</h1>
<a href="/">Back to TOC</a>

<pre>Data: {JSON.stringify(data.rdata, null, 2)}</pre>
<p>Error: {data.error}</p>
