import React from 'react'
import Head from 'next/head'
import '../styles/globals.css'
import type { AppProps } from 'next/app'

export default function App({ Component, pageProps }: AppProps) {
  console.log('🔍 DEBUG: _app.tsx - App component rendering');
  console.log('🔍 DEBUG: _app.tsx - Component:', Component.name);
  console.log('🔍 DEBUG: _app.tsx - pageProps keys:', Object.keys(pageProps));
  
  return (
    <>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <Component {...pageProps} />
    </>
  )
} 