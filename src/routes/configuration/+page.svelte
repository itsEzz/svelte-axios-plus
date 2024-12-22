<script lang="ts">
	import axiosPlus, { configure } from '$lib/index.svelte.js';
	import { LRUCache } from 'lru-cache';
	import Axios from 'axios';

	const axios = Axios.create({
		baseURL: 'https://reqres.in/api'
	});

	const cache = new LRUCache({ max: 10 });

	configure({ axios, cache }); // configure globally
	axiosPlus.configure({ axios, cache }); // configure per instance
</script>

<h1>Configuration example</h1>
<a href="/">Back to TOC</a>

<p>This example does not offer any output. Please checkout the code itself.</p>
