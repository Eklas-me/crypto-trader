import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import TrackerPage from './src/app/tracker/page.tsx';

try {
  const html = renderToString(createElement(TrackerPage));
  console.log("Render successful! Length:", html.length);
} catch(e) {
  console.error("RENDER ERROR:", e);
}
