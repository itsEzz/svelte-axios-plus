# svelte-axios-plus <!-- omit in toc -->

A Svelte-optimized Axios wrapper that provides reactive request handling, built-in caching, and simplified state management for HTTP requests.

## TOC <!-- omit in toc -->
- [Installation](#installation)
- [Compatibility](#compatibility)
- [Quickstart](#quickstart)
- [Documentation](#documentation)
- [Guides](#guides)
- [Reactivity](#reactivity)
- [Playground](#playground)
- [Breaking changes](#breaking-changes)
- [Testing](#testing)
- [Promises](#promises)
- [Credits](#credits)
- [License](#license)

## Installation

`npm install axios svelte-axios-plus`

> `axios` is a peer dependency and needs to be installed explicitly

## Compatibility

Version 2.x.x of `svelte-axios-plus` is built for Svelte 5.

Users running Svelte 4 applications should continue using the latest 1.x.x version of `svelte-axios-plus`.

Full documentation for v1 is available in the [v1 Readme](https://github.com/itsEzz/svelte-axios-plus/blob/v1/README.md).

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
	<button onclick={() => refetch()}>Refetch</button>
	<pre>{JSON.stringify(req.data, null, 2)}</pre>
</div>
```
[Ref](https://github.com/itsEzz/svelte-axios-plus/tree/master/src/routes/quickstart)

## Documentation

<!-- no toc -->
- [API](#api-)
- [axiosPlus](axiosplusurl--config----url--config-options----options-)
- [resetConfigure](#resetconfigure-)
- [configure](#configureoptions-)
- [clearCache](#clearcache-)
- [load](#loadurlconfig-options-)
- [getConfig](#getconfig-)
- [makeAxiosPlus](#makeaxiosplus-configureoptions)
  

### API <!-- omit in toc -->

The package exports one default export and named exports:

```ts
import axiosPlus, {
	resetConfigure,
	configure,
	clearCache,
	load,
	getConfig,
	makeAxiosPlus
} from 'svelte-axios-plus';
```

### axiosPlus(url | config | (() => url | config), options? | () => options) <!-- omit in toc -->

The main function to execute HTTP requests.

#### Parameters <!-- omit in toc -->

- `url|config` - String URL or axios [request config](https://github.com/axios/axios#request-config) 
- `options` - Configuration object
  - `manual` (default `false`) - Controls automatic request execution on component render. Use the `refetch` function returned when invoking `axiosPlus` to execute the request manually.
  - `useCache` (default `true`) - Enables/disables request caching. It doesn't affect the `refetch` function returned by `axiosPlus`.
  - `autoCancel` ( `true` ) - Controls automatic cancellation of pending requests

> [!IMPORTANT]  
> Default caching behavior can interfere with test isolation. See [testing](#testing) section.

#### Returns <!-- omit in toc -->

An object with the following properties:

- `req` - Request state object
  - `data` - Response data from the axios [success response](https://github.com/axios/axios#response-schema)
  - `loading` - Current request status (true if the request is in progress, otherwise false)
  - `error` - [Error](https://github.com/axios/axios#handling-errors) details if request failed
  - `response` - Complete [success response](https://github.com/axios/axios#response-schema) object
  
- `refetch(configOverride?, options?)` - Manual request execution
  - `config` - Same `config` object as `axios`, which is _shallow-merged_ with the config object provided when invoking `axiosPlus`. 
  - `options.useCache` (default `false`) - Enables/disables request caching
  - **Returns**: A promise containing the response. If the request is unsuccessful, the promise rejects and the rejection must be handled manually.
- `cancel()` - Cancels pending requests
- `reset(force?)` - Resets the request state to its initial state
  - `force` (default `false`) - Forces a reset even if the request is in progress by cancelling the pending request

### resetConfigure() <!-- omit in toc -->

Resets all configuration options back to default values.

Default values:
- `axios` - `StaticAxios` instance
- `cache` - `new LRUCache({ max: 500, ttl: 1000 * 60 })`
- `defaultOptions` - `{manual: false, useCache: true, autoCancel: true}`
- `defaultLoadOptions` - `{useCache: true}`

### configure(options?) <!-- omit in toc -->

Configures the `axiosPlus` instance with custom options.

#### Parameters <!-- omit in toc -->

- `axios` - Custom [Axios](https://github.com/axios/axios#creating-an-instance) instance or Axios-like client
- `cache` - [LRU cache](https://github.com/isaacs/node-lru-cache) instance or false to disable caching
- `defaultOptions` - Default options for all requests. It will be merged with the out of the box default options.
  - `manual` - Controls automatic request execution on component render. Use the `refetch` function returned when invoking `axiosPlus` to execute the request manually.
  - `useCache` - Enables/disables request caching. It doesn't affect the `refetch` function returned by `axiosPlus`.
  - `autoCancel` - Controls automatic cancellation of pending requests
- `defaultLoadOptions` - Default options for `load` function
  - `useCache` - Enables/disables request caching   

### clearCache() <!-- omit in toc -->

Clears the current [LRU cache](https://github.com/isaacs/node-lru-cache) if caching is enabled.

### load(url|config, options?) <!-- omit in toc -->

Performs a one-time request with optional caching.

#### Parameters <!-- omit in toc -->

- `url|config` - String URL or axios [request config](https://github.com/axios/axios#request-config)
- `options.useCache` (default `true`) - Enables/disables request caching

#### Returns <!-- omit in toc -->

A promise with the following properties:

  - `data` - Response data from the axios [success response](https://github.com/axios/axios#response-schema)
  - `error` - [Error](https://github.com/axios/axios#handling-errors) details if request failed
  - `response` - Complete [success response](https://github.com/axios/axios#response-schema) object

### getConfig() <!-- omit in toc -->

Returns the current configured options.

#### Returns <!-- omit in toc -->

An object with the following properties:

- `axios` - Current Axios instance
- `cache` - Current [LRU cache](https://github.com/isaacs/node-lru-cache) instance or false if disabled
- `defaultOptions` - Default options configuration
- `defaultLoadOptions` - Default load options configuration

### makeAxiosPlus(configureOptions?) <!-- omit in toc -->

Creates a new `axiosPlus` instance with optional initial configuration.

#### Parameters <!-- omit in toc -->

- `axios` - Custom [Axios](https://github.com/axios/axios#creating-an-instance) instance or Axios-like client
- `cache` - [LRU cache](https://github.com/isaacs/node-lru-cache) instance or false to disable caching
- `defaultOptions` - Default options for all requests. It will be merged with the out of the box default options.
  - `manual` - Controls automatic request execution on component render. Use the `refetch` function returned when invoking `axiosPlus` to execute the request manually.
  - `useCache` - Enables/disables request caching. It doesn't affect the `refetch` function returned by `axiosPlus`.
  - `autoCancel` - Controls automatic cancellation of pending requests
- `defaultLoadOptions` - Default options for `load` function
  - `useCache` - Enables/disables request caching   

#### Returns <!-- omit in toc -->

Preconfigured `axiosPlus` instance with the same methods as the package's named exports but limited to the `axiosPlus` instance returned by `makeAxiosPlus`.

## Guides

<!-- no toc -->
- [Configuration](#configuration-)
- [Manual Requests](#manual-requests-)
- [Manual Cancellation](#manual-cancellation-)
- [Server Side Rendering](#server-side-rendering-)
- [Multiple Hook Instances](#multiple-hook-instances-)

### Configuration <!-- omit in toc -->

Unless provided via the `configure` function, `svelte-axios-plus` uses the following defaults:

- `axios` - `StaticAxios` instance
- `cache` - `new LRUCache({ max: 500, ttl: 1000 * 60 })`
- `defaultOptions` - `{manual: false, useCache: true, autoCancel: true}`
- `defaultLoadOptions` - `{useCache: true}`

These defaults may not suit your needs, for example:

- you may want a common base url for axios requests
- the default cache size and ttl may not be a suitable default
- you want to disable caching altogether

In such cases you can use the `configure` function to provide your custom implementation of both.

```svelte
<script lang="ts">
	import axiosPlus, { configure } from 'svelte-axios-plus';
	import { LRUCache } from 'lru-cache';
	import Axios from 'axios';

	const axios = Axios.create({
		baseURL: 'https://reqres.in/api'
	});

	const cache = new LRUCache({ max: 10 });

	configure({ axios, cache }); // configure globally
	axiosPlus.configure({ axios, cache }) // configure per instance
</script>
```
[Ref](https://github.com/itsEzz/svelte-axios-plus/tree/master/src/routes/configuration)

### Manual Requests <!-- omit in toc -->

On the client, requests are executed when the component renders using the Svelte `$effect` rune.

This may be undesirable, as in the case of non-GET requests. By using the `manual` option you can skip the automatic execution of requests and use the return value of `axiosPlus` to execute them manually, optionally providing configuration overrides to `axios`.

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

	async function updateData() {
		try {
			await refetch({
				data: {
					...getReq.data,
					updatedAt: new Date().toISOString()
				}
			});
		} catch (error) {
			// Handle errors
		}
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

### Manual Cancellation <!-- omit in toc -->

The `cancel` function allows you to terminate pending requests, whether initiated automatically or through the `refetch` method.

In the example below we use `axiosPlus` with its automatic and manual requests.
We can call the cancellation programmatically or via controls.

```svelte
<script lang="ts">
	import axiosPlus from 'svelte-axios-plus';

	let pagination: Record<string, number> = $state({ per_page: 6, page: 1 });
	const { req, refetch, cancel } = axiosPlus(() => ({
			url: 'https://reqres.in/api/users?delay=5',
			params: pagination
		})
	);

	function handleFetch() {
		pagination = { ...pagination, page: pagination.page + 1 };
	};

	async function externalRefetch() {
		try {
			await refetch();
		} catch (error) {
			// Handle errors
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

### Server Side Rendering <!-- omit in toc -->

For server-side requests containing sensitive data like API keys, use the async `load` function instead of `axiosPlus`. This integrates with SvelteKit's server-side data loading pattern.

In Svelte you can load data for your page via the `+page.server.ts` file. The logic inside that file is only executed on the server. You can read more about that topic over [here](https://kit.svelte.dev/docs/routing#page).

1. Create a `+page.server.ts` file for your route
	```ts
	import axiosPlus from 'svelte-axios-plus';

	interface PageServerLoad {
		(): Promise<{
			rdata: any;
			error: string;
		}>;
	}

	export const load: PageServerLoad = async () => {
		const { data, error, response } = await axiosPlus.load('https://reqres.in/api/users?delay=1');
		return {
			rdata: data,
			error: JSON.stringify(error, null, 2)
		};
	};

	export const ssr = true; 
	export const csr = false;
	```
	[Ref](https://github.com/itsEzz/svelte-axios-plus/tree/master/src/routes/page-server)
2. Access data in `+page.svelte`
	```svelte
	<script lang="ts">
		interface Props {
			data: {
				rdata: any;
				error: string;
			};
		}

		let { data }: Props = $props();
	</script>

	<pre>Data: {JSON.stringify(data.rdata, null, 2)}</pre>
	<p>Error: {data.error}</p>
	```
	[Ref](https://github.com/itsEzz/svelte-axios-plus/tree/master/src/routes/page-server)

### Multiple Hook Instances <!-- omit in toc -->

For applications requiring different API configurations or caching strategies, `makeAxiosPlus` enables creation of independent `axiosPlus` instances.

This factory function returns a configured `axiosPlus` instance based on provided configuration.

> **Tip** Use this to create pre-configured instances as an alternative to the global `configure` function.

```svelte
<script lang="ts">
	import axios from 'axios';
	import { makeAxiosPlus } from 'svelte-axios-plus';

	const customAxiosPlus = makeAxiosPlus({
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

While `axiosPlus` is not inherently reactive to argument changes, you can enable reactivity through:
- Lazy evaluation
- The `$derived` rune
- An `$effect` rune with the `refetch` function

For detailed information on Svelte function reactivity, refer to:
- [Passing state into functions](https://svelte.dev/docs/svelte/$state#Passing-state-into-functions)
- [Compiler warnings: state_referenced_locally](https://svelte.dev/docs/svelte/compiler-warnings#state_referenced_locally)

**Notable Feature**: When using an options state object with `axiosPlus`, changes to this object automatically trigger reactive updates by default (see example below).

```svelte
<script lang="ts">
	import axiosPlus, { type AxiosPlusOptions } from 'svelte-axios-plus';

	let options: AxiosPlusOptions = $state({
		manual: true,
		autoCancel: true,
		useCache: true
	});

	// The following two axiosPlus calls are equivalent and will react to 'options' state changes
	const { req: req1 } = axiosPlus('https://reqres.in/api/users?delay=5', options);
	const { req: req2 } = axiosPlus('https://reqres.in/api/users?delay=5', () => options);
</script>
```

### 1. Lazy Evaluation (Recommended) <!-- omit in toc -->

The `axiosPlus` function offers flexible configuration through dynamic function arguments. You can pass both the config and options as functions, enabling `axiosPlus` to automatically respond to state changes in these function arguments.

Here's what makes this powerful:
1. Pass config as a function: `axiosPlus(() => config)`  
2. Pass options as a function: `axiosPlus(config, () => options)`  
3. Pass both as functions: `axiosPlus(() => config, () => options)`  
   
The best part? You have complete flexibility - use functions for dynamic state values and plain objects for static configurations. This means you can mix and match based on your needs.

- Pros
  - Implements Svelte's recommended approach for reactive state passing
  - Preserves `axiosPlus` internal state integrity, with request cancellation controlled through the `autoCancel` flag
- Cons
  - Introduces function parameters, slightly increasing the complexity of the `axiosPlus` implementation

```svelte
<script lang="ts">
	import axiosPlus, { type AxiosPlusOptions } from 'svelte-axios-plus';

	let pagination: Record<string, number> = $state({});
	let options: AxiosPlusOptions = $state({
		manual: true,
		autoCancel: true,
		useCache: true
	});

	const { req } = axiosPlus(
		() => ({
			url: 'https://reqres.in/api/users?delay=5',
			params: pagination
		}),
		() => options
	);
</script>
```
[Ref](https://github.com/itsEzz/svelte-axios-plus/tree/master/src/routes/reactivity)

### 2. Dervied method <!-- omit in toc -->

Using the `$derived` rune with `axiosPlus` triggers a complete function reinitialization whenever any referenced state values are modified.

- Pros
  - Simple implementation requiring only a `$derived` rune wrapper around the `axiosPlus` function
- Cons
  - Reinitializing the entire `axiosPlus` function resets its internal state and terminates active requests, regardless of the `autoCancel` setting

```svelte
<script lang="ts">
	import axiosPlus, { type AxiosPlusOptions } from 'svelte-axios-plus';

	let pagination: Record<string, number> = $state({});
	let options: AxiosPlusOptions = $state({
		manual: true,
		autoCancel: true,
		useCache: true
	});

	const { req } = $derived(
		axiosPlus(
			{
				url: 'https://reqres.in/api/users?delay=5',
				params: pagination
			},
			options
		)
	);
</script>
```
[Ref](https://github.com/itsEzz/svelte-axios-plus/tree/master/src/routes/reactivity)

### 3. Effect method <!-- omit in toc -->

Using the `$effect` rune to trigger the `refetch` function on state changes provides a robust and controlled approach to handling reactive updates.

- Pros
  - Flexible state management without requiring initial state declaration in `axiosPlus` initialization
  - Maintains `axiosPlus` internal state integrity, with request cancellation controlled solely by the `autoCancel` setting
- Cons
  - Requires additional implementation through the `$effect` rune, increasing code footprint
  - Reactivity is limited to `configOverride` and `useCache` options, excluding other settings like `manual` and `autoCancel`

```svelte
<script lang="ts">
	import axiosPlus, { type RefetchOptions } from 'svelte-axios-plus';

	let pagination: Record<string, number> = $state({});
	let options: RefetchOptions = $state({
		useCache: true
	});

	const { req, refetch } = axiosPlus(
		{
			url: 'https://reqres.in/api/users?delay=5'
		},
		options
	);

	$effect(() => {
		async function fetchData() {
			try {
				await refetch({ params: pagination }, options);
			} catch (error) {
				// Handle errors
			}
		}

		fetchData();
	});
</script>
```
[Ref](https://github.com/itsEzz/svelte-axios-plus/tree/master/src/routes/reactivity)

## Playground

The project includes a very simple playground example to play around with the library and its features.

1. Clone the repository
2. Install dependencies via `npm install`
3. Start the project via `npm run dev`
4. Open the displayed url in your browser (most likely [http://localhost:5173](http://localhost:5173))
5. Click on the Playground link

[Ref](https://github.com/itsEzz/svelte-axios-plus/tree/master/src/routes/playground)

## Breaking changes

<details>
  <summary>Version 2.0.0</summary>

### General <!-- omit in toc -->

- Requires Svelte 5
- The library now uses Svelte 5's runes system internally
- State management switched from Svelte 4 stores to Svelte 5's state management

### Types & Interfaces <!-- omit in toc -->

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
		req: Readonly<RequestState<TResponse, TBody, TError>>;
		refetch: RefetchFunction<TBody, TResponse>;
		cancel: () => void;
		reset: (force?: boolean) => void;
	};
	```

### Usage of `axiosPlus` <!-- omit in toc -->

Due to the `AxiosPlusResult` type update the usage of `axiosPlus` has changed (see example below).  

Further request state is now returned through the `req` property, and direct destructuring is no longer supported to maintain reactive state.

- Version 1.x.x usage example

  ```svelte
  <script lang="ts">
	import axiosPlus from 'svelte-axios-plus';

	const [{ loading, data, error }, refetch] = axiosPlus('https://reqres.in/api/users?delay=1');
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

- Version 2.0.0 usage example

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
	<button onclick={() => refetch()}>Refetch</button>
	<pre>{JSON.stringify(req.data, null, 2)}</pre>
  </div>
  ```

</details>

## Testing

Testing components that use `axiosPlus` may experience test isolation issues due to built-in caching. To ensure proper test isolation, call the configure function before each test to disable the cache:

```ts
configure({ cache: false });
```

## Promises

`svelte-axios-plus` requires ES6 Promise support. Check your environment's compatibility [here](http://caniuse.com/promises).

For environments without ES6 Promise support, use some polyfill like this one [ES6 promise](https://github.com/jakearchibald/es6-promise).

## Credits

`svelte-axios-plus` is heavily inspired by [axios-hooks](https://github.com/simoneb/axios-hooks).  

It began as a simple port of the `axios-hooks` package to svelte, but over the time I added some additional features that are not present in the `axios-hooks` package.

## License

[MIT License](https://github.com/itsEzz/svelte-axios-plus/tree/master/LICENSE.md)

Dependencies:
- [axios](https://github.com/axios/axios)
- [lru-cache](https://github.com/isaacs/node-lru-cache)