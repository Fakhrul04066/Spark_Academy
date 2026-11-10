"use client";
import {useEffect,useRef} from "react";
import {landingMarkup} from "./reference-markup";
import {mountReferenceLanding} from "./reference-interactions";
import "./reference-landing.css";

// This markup is the reviewed, local reference document, never runtime user input.
export function ReferenceLanding(){
 const root=useRef<HTMLDivElement>(null);
 useEffect(()=>root.current?mountReferenceLanding(root.current):undefined,[]);
 return <div ref={root} dangerouslySetInnerHTML={{__html:landingMarkup}}/>;
}
