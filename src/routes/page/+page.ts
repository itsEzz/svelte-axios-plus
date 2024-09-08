import axiosPlus from '$lib/index.js';

interface PageLoad {
	(): Promise<{
		rdata: any;
		error: string;
	}>;
}

export const load: PageLoad = async () => {
	const { data, error, response } = await axiosPlus.load('https://reqres.in/api/users?delay=1');
	return {
		rdata: data,
		error: JSON.stringify(error, null, 2)
	};
};

export const ssr = true;
export const csr = false;
