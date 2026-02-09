import { ScrollViewStyleReset } from 'expo-router/html';

// TODO: Replace ca-pub-XXXXXXXXXXXXXXXX with real AdSense publisher ID
export default function Root({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no"
        />

        {/* Google AdSense */}
        <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-XXXXXXXXXXXXXXXX"
          crossOrigin="anonymous"
        />

        <ScrollViewStyleReset />
      </head>
      <body style={{ overflow: 'hidden' }}>{children}</body>
    </html>
  );
}
