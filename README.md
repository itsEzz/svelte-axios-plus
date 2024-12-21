# svelte-axios-plus

Axios with some additional features to make working with request even more simple and better.

## Installation

`npm install axios svelte-axios-plus`

> `axios` is a peer dependency and needs to be installed explicitly

## Compatibility

Version 2.x.x of `svelte-axios-plus` is built for Svelte 5.

Users running Svelte 4 applications should continue using the latest 1.x.x version of `svelte-axios-plus`.

Full documentation for v1 is available in the [v1 Readme](https://github.com/itsEzz/svelte-axios-plus/blob/v1/README.md).

## Breaking changes

<details>
  <summary>Version 2.0.0</summary> 

  ### General
  - Requires Svelte 5 
  - The library now uses Svelte 5's runes system internally  
  - State management switched from Svelte 4 stores to Svelte 5's state management
  
  ### Types & Interfaces
  - Renamed the following interfaces
    - `ResponseValues` -> `RequestState`
    - `Options` -> `AxiosPlusOptions`
  - Updated the `AxiosPlusResult` type
    ```ts
	// Old type 
	type AxiosPlusResult<TResponse = any, TBody = any, TError = any> = [
		{
			loading: Readable<boolean>;
			data: Readable<TResponse | undefined>;
			error: Readable<AxiosError<TError, TBody> | null>;
			response: Readable<AxiosResponse<TResponse, TBody> | undefined>;
		},
		RefetchFunction<TBody, TResponse>,
		() => void,
		() => void
	];

	// New type
	type AxiosPlusResult<TResponse = any, TBody = any, TError = any> = {
		req: Readonly<RequestState>;
		refetch: RefetchFunction<TBody, TResponse>;
		cancel: () => void;
		reset: () => void;
	};
	```

  ### Usage of `axiosPlus`
  Due to the `AxiosPlusResult` type update the usage of `axiosPlus` has changed (see example below).  
  Further request state is now returned through the `req` property, and direct destructuring is no longer supported to maintain reactive state.
  - Version 1.x.x usage example
	```svelte
	<script lang="ts">
		import axiosPlus from 'svelte-axios-plus';

		const [{ loading, data, error }, refetch] = axiosPlus(
			'https://reqres.in/api/users?delay=1'
		);
	</script>

	{#if $loading}
		<p>Loading...</p>
	{:else if $error}
		<p>Error!</p>
	{/if}
	<div>
		<button on:click={refetch}>Refetch</button>
		<pre>{JSON.stringify($data, null, 2)}</pre>
	</div>
	```
  - Version 2.x.x usage example
	```svelte
	<script lang="ts">
		import axiosPlus from 'svelte-axios-plus';

		const {req, refetch} = axiosPlus(
			'https://reqres.in/api/users?delay=1'
		);
	</script>

	{#if req.loading}
		<p>Loading...</p>
	{:else if req.error}
		<p>Error!</p>
	{/if}
	<div>
		<button onclick={refetch}>Refetch</button>
		<pre>{JSON.stringify(req.data, null, 2)}</pre>
	</div>
	```

</details>

## Quickstart

```svelte
<script lang="ts">
	import axiosPlus from 'svelte-axios-plus';

	const { req, refetch } = axiosPlus('https://reqres.in/api/users?delay=1');
</script>

{#if req.loading}
	<p>Loading...</p>
{:else if req.error}
	<p>Error!</p>
{/if}
<div>
	<button onclick={refetch}>Refetch</button>
	<pre>{JSON.stringify(req.data, null, 2)}</pre>
</div>
```
[Ref](https://github.com/itsEzz/svelte-axios-plus/tree/master/src/routes/quickstart)

## Documentation

### API
<!-- no toc -->
- [axiosPlus](#axiosplusurlconfig-options)
- [resetConfigure](#resetconfigure)
- [configure](#configure-axios-cache-defaultoptions-defaultloadoptions-)
- [clearCache](#clearcache)
- [load](#loadurlconfig-options) 
- [getConfig](#getconfig)
- [makeAxiosPlus](#makeaxiosplus-axios-cache-defaultoptions-defaultloadoptions-)

### Guides

<!-- no toc -->
- [Configuration](#configuration)
- [Manual Requests](#manual-requests)
- [Manual Cancellation](#manual-cancellation)
- [Server Side Rendering](#server-side-rendering)
- [Multiple Hook Instances](#multiple-hook-instances)
- [Reactivity](#reactivity)
- [Playground](#playground)

## API

The package exports one default export and named exports:

```svelte
import axiosPlus, {
	resetConfigure,
  	configure,
	clearCache,
	load,
	getConfig,
  	makeAxiosPlus
} from 'svelte-axios-plus';
```

### axiosPlus(url|config, options)

The main function to execute HTTP requests.

- `url|config` - Either a plain url as string or an axios [request config](https://github.com/axios/axios#request-config) object, like you normally would if you use `axios` directly.
- `options` - An options object.
  - `manual` ( `false` ) - If true, the request is not executed immediately. Useful for non-GET requests that should not be executed when the component renders. Use the `execute` function returned when invoking `axiosPlus` to execute the request manually.
  - `useCache` ( `true` ) - Allows caching to be enabled/disabled for `axiosPlus`. It doesn't affect the `refetch` function returned by `axiosPlus`.
  - `autoCancel` ( `true` ) - Enables or disables automatic cancellation of pending requests whether it be
    from the automatic `axiosPlus` request or from the manual `refetch` method.

> [!IMPORTANT]  
> Default caching behavior can interfere with test isolation. Read the [testing](#testing) section for more information.

**Returns**

`[req, refetch, cancel, reset]`

- `req.data` - The data property of the [success response](https://github.com/axios/axios#response-schema).
- `req.loading` - True if the request is in progress, otherwise False.
- `req.error` - The [error](https://github.com/axios/axios#handling-errors) value.
- `req.response` - The whole [success response](https://github.com/axios/axios#response-schema) object.

- `refetch(config, options)` - A function to execute the request manually, bypassing the cache by default.

  - `config` - Same `config` object as `axios`, which is _shallow-merged_ with the config object provided when invoking `axiosPlus`. Useful to provide arguments to non-GET requests.
  - `options` - An options object.
    - `useCache` ( `false` ) - Allows caching to be enabled/disabled for this `refetch` function.

  **Returns**

  A promise containing the response. If the request is unsuccessful, the promise rejects and the rejection must be handled manually.

- `cancel()` - A function to cancel outstanding requests manually.
- `reset(force)` - A function to reset the `axiosPlus` state to its default values.  
  - `force` ( `false` ) - If true the currently running request will be canceled before resetting the state. Otherwise the state will not be resetted if a request is currently running.

### resetConfigure()

Resets the `axiosPlus` config to its default.

### configure({ axios, cache, defaultOptions, defaultLoadOptions })

Allows to provide custom instances of cache and axios and to override the default options.

- `axios` An instance of [axios](https://github.com/axios/axios#creating-an-instance).
- `cache` An instance of [lru-cache](https://github.com/isaacs/node-lru-cache), or `false` to disable the cache.
- `defaultOptions` An object overriding the default options. It will be merged with the default options.
- `defaultLoadOptions` An object to override the default load options.

### clearCache()

Clears the current cache.

### load(url|config, options)

Allows the execution of `axiosPlus` in +page and +page.server load functions.

- `url|config` - Either a plain url as string or an axios [request config](https://github.com/axios/axios#request-config) object, like you normally would if you use `axios` directly.
- `options` - An options object.
  - `useCache` ( `true` ) - Allows caching to be enabled/disabled for `axiosPlus`.

**Returns**

A promise with the following props.

`{ data, error, response }`

- `data` - The data property of the [success response](https://github.com/axios/axios#response-schema).
- `error` - The [error](https://github.com/axios/axios#handling-errors) value.
- `response` - The whole [success response](https://github.com/axios/axios#response-schema) object.

### getConfig()

Returns the current `svelte-axios-plus` config.

**Returns**

`{ axios, cache, defaultOptions, defaultLoadOptions }`

- `axios` The currently configured axios instance that is being used.
- `cache` The currently configured LRU cache instance that is being used or `false` if the cache is disabled.
- `defaultOptions` The currently configured default options.
- `defaultLoadOptions` The currently configured default load options.

### makeAxiosPlus({ axios, cache, defaultOptions, defaultLoadOptions })

Creates an instance of `axiosPlus` configured with the axios instance, supplied cache and default options.

- `axios` An instance of [axios](https://github.com/axios/axios#creating-an-instance).
- `cache` An instance of [lru-cache](https://github.com/isaacs/node-lru-cache), or `false` to disable the cache.
- `defaultOptions` An object overriding the default options. It will be merged with the default options.
- `defaultLoadOptions` An object to override the default load options.

**Returns**

An instance of `axiosPlus` which will always use the provided cache and axios instance.

The returned value, besides being a function that can be used execute requests, also contains the properties:

- `resetConfigure`
- `configure`
- `clearCache`
- `load`
- `getConfig`

which are the same as the package's named exports but limited to the `axiosPlus` instance returned by `makeAxiosPlus`.

## Configuration

Unless provided via the `configure` function, `svelte-axios-plus` uses the following defaults:

- `axios` - the default `axios` package export.
- `cache` - a new instance of the default `lru-cache` package export, with the following args `{ max: 500, ttl: 1000 * 60 }`.
- `defaultOptions` - `{ manual: false, useCache: true, autoCancel: true }`
- `defaultLoadOptions` - `{ useCache: true }`

These defaults may not suit your needs, for example:

- you may want a common base url for axios requests
- the default cache size and ttl may not be a suitable default
- you want to disable caching altogether

In such cases you can use the `configure` function to provide your custom implementation of both.

### Example

```svelte
<script lang="ts">
	import { configure } from 'svelte-axios-plus';
	import { LRUCache } from 'lru-cache';
	import Axios from 'axios';

	const axios = Axios.create({
		baseURL: 'https://reqres.in/api'
	});

	const cache = new LRUCache({ max: 10 });

	configure({ axios, cache });
</script>
```
[Ref](https://github.com/itsEzz/svelte-axios-plus/tree/master/src/routes/configuration)

## Manual Requests

On the client, requests are executed when the component renders using the Svelte `$effect` rune.

This may be undesirable, as in the case of non-GET requests. By using the `manual` option you can skip the automatic execution of requests and use the return value of `axiosPlus` to execute them manually, optionally providing configuration overrides to `axios`.

### Example

In the example below we use `axiosPlus` twice. Once to load the data when the component renders, and once to submit data updates via a `PUT` request configured via the `manual` option.

```svelte
<script lang="ts">
	import axiosPlus from 'svelte-axios-plus';

	const { req: getReq } = axiosPlus('https://reqres.in/api/users/1');

	const { req: putReq, refetch } = axiosPlus(
		{
			url: 'https://reqres.in/api/users/1',
			method: 'PUT'
		},
		{ manual: true }
	);

	function updateData() {
		refetch({
			data: {
				...getReq.data,
				updatedAt: new Date().toISOString()
			}
		});
	}
</script>

{#if getReq.loading || putReq.loading}
	<p>Loading...</p>
{/if}
{#if getReq.error || putReq.error}
	<p>Error!</p>
{/if}

<div>
	<button onclick={updateData}>Update data</button>
	<pre>{JSON.stringify(putReq.data || getReq.data, null, 2)}</pre>
</div>
```
[Ref](https://github.com/itsEzz/svelte-axios-plus/tree/master/src/routes/manual-requests)

## Manual Cancellation

The cancellation method can be used to cancel an outstanding request whether it be
from the automatic request or from the manual `refetch` method.

### Example

In the example below we use `axiosPlus` with its automatic and manual requests.
We can call the cancellation programmatically or via controls.

```svelte
<script lang="ts">
	import axiosPlus from 'svelte-axios-plus';

	let pagination: Record<string, number> = $state({ per_page: 6, page: 1 });
	const { req, refetch, cancel } = $derived(
		axiosPlus({
			url: 'https://reqres.in/api/users?delay=5',
			params: pagination
		})
	);

	const handleFetch = () => {
		pagination = { ...pagination, page: pagination.page + 1 };
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
	<button onclick={handleFetch}>Refetch</button>
	<button onclick={externalRefetch}>External Refetch</button>
	<button disabled={!req.loading} onclick={cancel}>Cancel Request</button>
	{#if req.loading}
		<p>...loading</p>
	{/if}
	<pre>{JSON.stringify(req.data, null, 2)}</pre>
</div>
```
[Ref](https://github.com/itsEzz/svelte-axios-plus/tree/master/src/routes/manual-cancellation)

## Server Side Rendering

Sometimes it's necessary to execute requests directly on the server because the requests contain api keys or other private information.   
Currently it's not possible to use the `axiosPlus` function for these use cases.   
However the library offers the async `load` function for these scenarios.

### How it works
In Svelte you can load data for your page via the `+page.server.ts` file. The logic inside that file is only executed on the server. You can read more about that topic over [here](https://kit.svelte.dev/docs/routing#page).  

1. Create a `+page.server.ts` file for your route
2. Paste the following code in the file
	1. Import `axiosPlus`
		```svelte
		import axiosPlus from 'svelte-axios-plus';
		```
	2. Define the response type of your svelte load function somewhere
		```svelte
		interface PageServerLoad {
			(): Promise<{
				rdata: any;
				error: string;
			}>;
		}
		```
	3. Add the code for the svelte load function 
		```svelte
		export const load: PageServerLoad = async () => {
			const { data, error, response } = await axiosPlus.load('https://reqres.in/api/users?delay=1');
			return {
				rdata: data,
				error: JSON.stringify(error, null, 2)
			};
		};
		```
		> **_NOTE_**: We now use the `axiosPlus.load` function to directly fetch our data. Keep in mind that you need to await the `axiosPlus.load` function because it's async.
	4. Last but no least we explicitly disable csr and enable ssr
		```svelte
		export const ssr = true;
		export const csr = false;
		```
3. We can now access the data of our svelte load function in our `+page.svelte` file like this
   ```svelte
	<script lang="ts">
		export let data: PageServerLoad;
	</script>

	<pre>Data: {JSON.stringify(data.rdata, null, 2)}</pre>
	<p>Error: {data.error}</p>
   ```
   
[Ref](https://github.com/itsEzz/svelte-axios-plus/tree/master/src/routes/page-server)

## Multiple Hook Instances

Sometimes it is necessary to communicate with different APIs or use different caching strategies for different HTTP interactions.

[`makeAxiosPlus`](#makeaxiosplus-axios-cache-defaultoptions-defaultloadoptions-) allows to create multiple instances of `axiosPlus` which can be configured and managed independently. 

In other words, `makeAxiosPlus` is a factory of `axiosPlus`, which returns a function configured against the provided `axios` or `cache` instances.

> This feature can also be used to create a single pre configured function instance as an alternative to the global `configure` feature.

### Example

```svelte
<script lang="ts">
	import axios from 'axios';
	import { makeAxiosPlus } from 'svelte-axios-plus';

	const axiosPlus = makeAxiosPlus({
		axios: axios.create({ baseURL: 'https://reqres.in/api' })
	});

	const { req, refetch } = customAxiosPlus('/users?delay=1');
</script>

{#if req.loading}
	<p>Loading...</p>
{/if}
{#if req.error}
	<p>Error!</p>
{/if}

<div>
	<button onclick={() => refetch()}>Refetch</button>
	<pre>{JSON.stringify(req.data, null, 2)}</pre>
</div>
```
[Ref](https://github.com/itsEzz/svelte-axios-plus/tree/master/src/routes/multiple-hook-instances)

## Reactivity

Normally `axiosPlus` doesn't react to argument changes. However it is possible to rerun the function if referenced state changes by using the `$derived` rune or an `$effect` rune that calls the `refetch` function.

### `$derived` method

Wrapping `axiosPlus` with the `$derived` rune will rerun the function every time referenced state changes. 

- Pros
  - Only requires the `axiosPlus` function to be wrapped with the `$derived` rune
  - Best way if you don't need to keep the internal state of `axiosPlus` intact
- Cons
  - Only works if the state that can change is referenced inside the `$derived` rune
  - Due to the whole `axiosPlus` function being rerun, the internal state of `axiosPlus` is lost and currently running requests are canceled even if the `autoCancel` option is set to `false`

```svelte
<script lang="ts">
	import axiosPlus from 'svelte-axios-plus';

	const pagination: Record<string, number> = $state({});
	const { req } = $derived(axiosPlus({
		url: 'https://reqres.in/api/users?delay=5',
		params: pagination
	}));
</script>
```
[Ref](https://github.com/itsEzz/svelte-axios-plus/tree/master/src/routes/reactivity)

### `$effect` method

Using the `$effect` rune to call the `refetch` function when state changes.

- Pros
  - State that can change doesn't need to be provided on `axiosPlus` function initialization
  - The internal state of `axiosPlus` is kept intact and currently running requests are only canceled if the `autoCancel` option is set to `true`
- Cons
  - Requires an additional `$effect` rune which results in more code
  - Not the best solution if you can achieve the same result with the `$derived` method (depends on your requirements)

```svelte
<script lang="ts">
	import axiosPlus from 'svelte-axios-plus';

	const pagination: Record<string, number> = $state({});
	const { req, refetch } = axiosPlus({
		url: 'https://reqres.in/api/users?delay=5'
	});

	$effect(() => {
		async function fetchData() {
			try {
				await refetch({params: pagination});
			} catch (error) {
				// Handle errors here
			}	
		}

		fetchData();
	})
</script>
```
[Ref](https://github.com/itsEzz/svelte-axios-plus/tree/master/src/routes/reactivity)

### Playground

The project includes a very simple playground example to play around with the library and its features.

Follow these steps to access the playground:
1. Clone the repository
2. Install dependencies via `npm install`
3. Start the project via `npm run dev`
4. Open the displayed url in your browser (most likely http://localhost:5173)
5. Click on the Playground link

[Ref](https://github.com/itsEzz/svelte-axios-plus/tree/master/src/routes/playground)

## Testing

Testing components that make use of the `axiosPlus` function are susceptible to test isolation leakage because of default caching behavior. To avoid this you can call the `configure` function before every test to disable caching.

## Promises

`svelte-axios-plus` depends on a native ES6 Promise implementation to be [supported](http://caniuse.com/promises).
If your environment doesn't support ES6 Promises, you can [polyfill](https://github.com/jakearchibald/es6-promise).

## Credits

`svelte-axios-plus` is heavily inspired by [axios-hooks](https://github.com/simoneb/axios-hooks).  
It began as a simple port of the `axios-hooks` package to svelte, but over the time I added some additional features that are not present in the `axios-hooks` package.

## License

[MIT](https://github.com/itsEzz/svelte-axios-plus/tree/master/LICENSE.md)

[axios](https://github.com/axios/axios)