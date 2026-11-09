import {createServer} from 'vite';
import {renderToString} from 'react-dom/server';
import React from 'react';
const server=await createServer({server:{middlewareMode:true},appType:'custom',optimizeDeps:{noDiscovery:true,include:[]}});
try{
 const {default:App}=await server.ssrLoadModule('/src/App.jsx');
 const html=renderToString(React.createElement(App));
 const cards=html.split('class="course"').length-1;
 console.log('Rendered HTML:',html.length,'characters; course cards:',cards);
 if(cards!==6||!html.includes('Spark Academy'))throw new Error('Missing page content');
 if(html.includes('EduTrack')||!html.includes('© Spark Academy. All rights reserved.'))throw new Error('Branding verification failed');
}finally{await server.close();}
