import type { AppProps } from "next/app";
import { NhostProvider } from "@nhost/react";
import { nhost } from "../lib/nhost";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <NhostProvider nhost={nhost}>
      <Component {...pageProps} />
    </NhostProvider>
  );
}
