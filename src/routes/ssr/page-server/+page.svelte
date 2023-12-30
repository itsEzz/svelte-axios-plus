<script lang="ts">
	import { page } from '$app/stores';
</script>

<h1>SSR page.server example</h1>
<a href="/">Back to TOC</a>

<pre>Data: {JSON.stringify($page.data.rdata, null, 2)}</pre>
<p>Error: {$page.data.error}</p>
