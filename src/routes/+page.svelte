<script>
	import { resolve } from '$app/paths';
</script>

<h1>Welcome to svelte-axios-plus</h1>
<p>
	Visit <a href="https://github.com/itsEzz/svelte-axios-plus/blob/master/README.md">Github</a> to read
	the full documentation.
</p>
<p>Checkout the svelte-axios-plus examples shown in the README in action:</p>

<ul>
	<li>
		<a href={resolve('/quickstart')}>Quickstart</a>
	</li>
	<li>
		<a href={resolve('/configuration')}>Configuration</a>
	</li>
	<li>
		<a href={resolve('/manual-requests')}>Manual Requests</a>
	</li>
	<li>
		<a href={resolve('/manual-cancellation')}>Manual Cancellation</a>
	</li>
	<li><a href={resolve('/page')}>+page load function</a></li>
	<li><a href={resolve('/page-server')}>+page.server load function</a></li>
	<li>
		<a href={resolve('/multiple-hook-instances')}>Multiple Hook Instances</a>
	</li>
	<li>
		<a href={resolve('/reactivity')}>Reactivity</a>
	</li>
	<li><a href={resolve('/playground')}>Playground</a></li>
</ul>
