# WIP Notice

> [!IMPORTANT]  
> This library is still in development and has not yet been published to npm.

# svelte-axios-plus

Axios with some additional features to make working with request even more simple and better.   

## Installation

`npm install axios svelte-axios-plus`

> `axios` is a peer dependency and needs to be installed explicitly

## Version information

- `svelte-axios-plus` is compatible with `axios@1.x`

## Quick Start

```svelte
<script lang="ts">
	import axiosPlus from 'svelte-axios-plus';

	const [{ loading, data, error }, refetch, cancel] = axiosPlus(
		'https://reqres.in/api/users?delay=1'
	);
</script>

{#if $loading}
	<p>Loading...</p>
{:else if $error}
	<p>Error!</p>
{/if}
<div>
	<button on:click={() => refetch()}>Refetch</button>
	<pre>{JSON.stringify($data, null, 2)}</pre>
</div>

```

## Documentation

### API
<!-- no toc -->
- [axiosPlus](#axiosplusurlconfig-options)
- [configure](#configure-axios-cache-defaultoptions-)
- [makeAxiosPlus](#makeaxiosplus-axios-cache-defaultoptions-)

### Guides
<!-- no toc -->
- [Configuration](#configuration)
- [Manual Requests](#manual-requests)
- [Manual Cancellation](#manual-cancellation)
- [Server Side Rendering](#server-side-rendering)
- [Multiple Hook Instances](#multiple-hook-instances)

## API

The package exports one default export and named exports:

```svelte
import axiosPlus, {
  configure,
  makeUseAxios
} from 'svelte-axios-plus';
```

### axiosPlus(url|config, options)

The main function to execute HTTP requests.

- `url|config` - Either a plain url as string or an axios [request config](https://github.com/axios/axios#request-config) object, like you normally would if you use `axios` directly.
- `options` - An options object.
  - `manual` ( `false` ) - If true, the request is not executed immediately. Useful for non-GET requests that should not be executed when the component renders. Use the `execute` function returned when invoking `axiosPlus` to execute the request manually.
  - `useCache` ( `true` ) - Allows caching to be enabled/disabled for `axiosPlus`. It doesn't affect the `execute` function returned by `axiosPlus`.
  - `autoCancel` ( `true` ) - Enables or disables automatic cancellation of pending requests whether it be
    from the automatic `axiosPlus` request or from the `manual` execute method.

> [!IMPORTANT]  
> Default caching behavior can interfere with test isolation. Read the [testing](#testing) section for more information.

**Returns**

`[{ data, loading, error, response }, execute, manualCancel]`

- `data` - The data property of the [success response](https://github.com/axios/axios#response-schema).
- `loading` - True if the request is in progress, otherwise False.
- `error` - The [error](https://github.com/axios/axios#handling-errors) value.
- `response` - The whole [success response](https://github.com/axios/axios#response-schema) object.

- `execute([config[, options]])` - A function to execute the request manually, bypassing the cache by default.

  - `config` - Same `config` object as `axios`, which is _shallow-merged_ with the config object provided when invoking `axiosPlus`. Useful to provide arguments to non-GET requests.
  - `options` - An options object.
    - `useCache` ( `false` ) - Allows caching to be enabled/disabled for this `execute` function.

  **Returns**

  A promise containing the response. If the request is unsuccessful, the promise rejects and the rejection must be handled manually.

- `manualCancel()` - A function to cancel outstanding requests manually.

### configure({ axios, cache, defaultOptions })

Allows to provide custom instances of cache and axios and to override the default options.

- `axios` An instance of [axios](https://github.com/axios/axios#creating-an-instance).
- `cache` An instance of [lru-cache](https://github.com/isaacs/node-lru-cache), or `false` to disable the cache.
- `defaultOptions` An object overriding the default options. It will be merged with the default options.

### makeAxiosPlus({ axios, cache, defaultOptions })

Creates an instance of `axiosPlus` configured with the axios instance, supplied cache and default options.

- `axios` An instance of [axios](https://github.com/axios/axios#creating-an-instance).
- `cache` An instance of [lru-cache](https://github.com/isaacs/node-lru-cache), or `false` to disable the cache.
- `defaultOptions` An object overriding the default options. It will be merged with the default options.

**Returns**

An instance of `axiosPlus` which will always use the provided cache and axios instance.

The returned value, besides being a function that can be used execute requests, also contains the properties:

- `resetConfigure`
- `configure`

which are the same as the package's named exports but limited to the `axiosPlus` instance returned by `makeAxiosPlus`.

## Refresh Behavior

Normally `axiosPlus` doesn't react to argument changes. However it is possible to achieve this behavior using svelte [reactive statements](https://svelte.dev/docs/svelte-components#script-3-$-marks-a-statement-as-reactive), like shown in the following example.

```svelte
<script lang="ts">
	import { writable, type Writable } from 'svelte/store';
	import axiosPlus from 'svelte-axios-plus';

	const pagination: Writable<Record<string, number>> = writable({});
	$: [{ data, loading }, refetch, cancelRequest] = axiosPlus({
		url: 'https://reqres.in/api/users?delay=5',
		params: $pagination
	});
</script>
```

If you use [reactive statements](https://svelte.dev/docs/svelte-components#script-3-$-marks-a-statement-as-reactive), `axiosPlus` will compare your arguments to detect any changes.
When a change is detected, if the configuration allows a request to be fired (e.g. `manual:false`), any pending request is canceled and a new request is triggered, to avoid automatic cancellation you should use the `autoCancel:false` option.

## Configuration

Unless provided via the `configure` function, `svelte-axios-plus` uses the following defaults:

- `axios` - the default `axios` package export.
- `cache` - a new instance of the default `lru-cache` package export, with no arguments.
- `defaultOptions` - `{ manual: false, useCache: true, autoCancel: true }`

These defaults may not suit your needs, for example:

- you may want a common base url for axios requests
- the default (Infinite) cache size may not be a suitable default
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

## Manual Requests

On the client, requests are executed when the component renders using the Svelte port of the  `useEffect` react hook.

This may be undesirable, as in the case of non-GET requests. By using the `manual` option you can skip the automatic execution of requests and use the return value of `axiosPlus` to execute them manually, optionally providing configuration overrides to `axios`.

### Example

In the example below we use `axiosPlus` twice. Once to load the data when the component renders, and once to submit data updates via a `PUT` request configured via the `manual` option.

```svelte
<script lang="ts">
	import axiosPlus from 'svelte-axios-plus';

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

```

## Manual Cancellation

The cancellation method can be used to cancel an outstanding request whether it be
from the automatic request or from the `manual` execute method.

### Example

In the example below we use `axiosPlus` with its automatic and manual requests.
We can call the cancellation programmatically or via controls.

```svelte
<script lang="ts">
	import { writable, type Writable } from 'svelte/store';
	import axiosPlus from 'svelte-axios-plus';

	const pagination: Writable<Record<string, number>> = writable({});
	$: [{ data, loading }, refetch, cancelRequest] = axiosPlus({
		url: 'https://reqres.in/api/users?delay=5',
		params: $pagination
	});

	const handleFetch = () => {
		pagination.set({ per_page: 2, page: 2 });
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
	<button on:click={() => handleFetch()}>Refetch</button>
	<button on:click={() => externalRefetch()}>External Refetch</button>
	<button disabled={!$loading} on:click={() => cancelRequest()}>Cancel Request</button>
	{#if $loading}
		<p>...loading</p>
	{/if}
	<pre>{JSON.stringify($data, null, 2)}</pre>
</div>
```

## Server Side Rendering

Server Side Rendering is currently not implemented. This feature will get added in future releases.

## Multiple Hook Instances

Sometimes it is necessary to communicate with different APIs or use different caching strategies for different HTTP interactions.

[`makeAxiosPlus`](#makeaxiosplus-axios-cache-defaultoptions) allows to create multiple instances of `axiosPlus` which can be configured and managed independently.

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

	const [{ data, loading, error }, refetch] = axiosPlus('/users?delay=1');
</script>

{#if $loading}
	<p>Loading...</p>
{/if}
{#if $error}
	<p>Error!</p>
{/if}

<div>
	<button on:click={() => refetch()}>Refetch</button>
	<pre>{JSON.stringify($data, null, 2)}</pre>
</div>
```

## Testing

Testing components that make use of the `axiosPlus` function are susceptible to test isolation leakage because of default caching behavior. To avoid this you can call the `configure` function before every test to disable caching.

## Promises

`svelte-axios-plus` depends on a native ES6 Promise implementation to be [supported](http://caniuse.com/promises).
If your environment doesn't support ES6 Promises, you can [polyfill](https://github.com/jakearchibald/es6-promise).

## Credits

`svelte-axios-plus` is heavily inspired by [axios-hooks](https://github.com/simoneb/axios-hooks). 
It's basically an almost complete port of the react `axios-hooks` package that works with svelte.

## License

ISC

[axios](https://github.com/axios/axios)