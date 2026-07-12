import type { NextConfig } from "next";

const isGithubActions = process.env.GITHUB_ACTIONS === "true";

const nextConfig: NextConfig = {
	output: isGithubActions ? "export" : undefined,
	basePath: isGithubActions ? "/games" : undefined,
	images: {
		unoptimized: true,
		remotePatterns: [
			{
				protocol: 'https',
				hostname: 'www.4j.com',
				pathname: '/**',
			},
		],
	},
};

export default nextConfig;

// Enable calling `getCloudflareContext()` in `next dev`.
// See https://opennext.js.org/cloudflare/bindings#local-access-to-bindings.
if (process.env.NODE_ENV === "development") {
	const { initOpenNextCloudflareForDev } = require("@opennextjs/cloudflare");
	initOpenNextCloudflareForDev();
}
