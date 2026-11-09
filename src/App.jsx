import React,{useEffect,useRef,useState} from 'react';
import parse,{domToReact,attributesToProps} from 'html-react-parser';
import demo from './demo.json';
import './styles.css';
const catalog=[['junior','6'],['junior','7 8'],['ssc','9'],['ssc','10'],['hsc','hsc'],['hsc','hsc']];
export default function App(){
 const [filter,setFilter]=useState('all'),[grade,setGrade]=useState(''),[menu,setMenu]=useState(false),[modal,setModal]=useState(null),[message,setMessage]=useState(''),[faq,setFaq]=useState({});
 const dialog=useRef(null),previousFocus=useRef(null);
 const visible=(category,grades)=>grade?grades.split(' ').includes(grade):filter==='all'||category===filter;
 const count=catalog.filter(c=>visible(...c)).length;
 function open(mode,course=''){previousFocus.current=document.activeElement;setModal({mode,course});}
 function close(){setModal(null);previousFocus.current?.focus();}
 useEffect(()=>{if(!message)return;const timer=setTimeout(()=>setMessage(''),3500);return()=>clearTimeout(timer)},[message]);
 useEffect(()=>{if(!modal)return;dialog.current?.showModal();const prev=document.body.style.overflow;document.body.style.overflow='hidden';return()=>{document.body.style.overflow=prev}},[modal]);
 const options={replace(node){
  if(node.type!=='tag')return;
  const a={...node.attribs};const action=a.onclick;delete a.onclick;
  let tag=node.name;const props=attributesToProps(a);let children;
  const cls=a.class||'';
  if(a.id==='modalBackdrop')return <></>;
  if(a.id==='toast')return <div role="status" aria-live="polite" className={`toast ${message?'show':''}`}>{message}</div>;
  if(a.id==='count')return <span {...props}>{count}টি কোর্স দেখানো হচ্ছে</span>;
  if(a.id==='nothing')props.style={display:count?'none':'block'};
  if(a.id==='navlinks'){props.className=`links ${menu?'open':''}`;props.onClick=()=>setMenu(false);}
  if(cls==='course')props.hidden=!visible(a['data-category'],a['data-grade']);
  if(cls.startsWith('pill'))props.className=`pill ${filter===a['data-filter']?'active':''}`;
  if(cls==='grade')props.className=`grade ${grade===a['data-grade']?'active':''}`;
  if(cls==='faq-item')props.className=`faq-item ${faq[node.children.find(n=>n.name==='button')?.children?.[0]?.data]?'open':''}`;
  if(action){
   const arg=action.match(/\('([^']*)'\)/)?.[1];
   if(action.startsWith('showModal'))props.onClick=()=>open(arg);
   else if(action.startsWith('courseDetails')){tag='button';props.type='button';props.onClick=()=>open('course',arg);}
   else if(action.startsWith('filterCourses'))props.onClick=()=>{setFilter(arg);setGrade('');};
   else if(action.startsWith('chooseGrade'))props.onClick=()=>{setGrade(arg);setFilter(arg==='hsc'?'hsc':Number(arg)<9?'junior':'ssc');document.getElementById('courses').scrollIntoView({behavior:'smooth'});};
   else if(action.startsWith('toast'))props.onClick=()=>setMessage(arg);
   else if(action.includes('navlinks')){props.onClick=()=>setMenu(v=>!v);props['aria-expanded']=menu;props['aria-controls']='navlinks';}
   else if(action.includes('parentElement')){const key=node.children[0]?.data;props.onClick=()=>setFaq(v=>({...v,[key]:!v[key]}));props['aria-expanded']=!!faq[key];}
  }
  children=domToReact(node.children,options);
  return ['input','br','hr','img','meta','link'].includes(tag)?<node.name {...props}/>: tag==='button'?<button {...props}>{children}</button>:tag==='a'?<a {...props}>{children}</a>:ReactElement(tag,props,children);
 }};
 return <>{parse(demo,options)}{modal&&<dialog className="modal" ref={dialog} aria-labelledby="modalTitle" aria-describedby="modalDesc" onCancel={close} onClick={e=>{if(e.target===e.currentTarget){const r=e.currentTarget.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)close();}}}>
 <button className="modal-close" onClick={close} aria-label="বন্ধ করুন">×</button>
 <h2 id="modalTitle">{modal.mode==='login'?'ডেমো লগইন':modal.mode==='course'?'কোর্সের বিস্তারিত':'ভর্তির তথ্য'}</h2>
 <p id="modalDesc">{modal.course||'এটি একটি UI ডেমো। কোনো তথ্য সার্ভারে পাঠানো হবে না।'}</p>
 <form onSubmit={e=>{e.preventDefault();close();setMessage('✅ এটি একটি UI ডেমো। কোনো তথ্য জমা হয়নি।');}}>
 <div className="formrow"><label htmlFor="name">নাম</label><input id="name" autoFocus autoComplete="name" required placeholder="আপনার নাম লিখুন"/></div>
 <div className="formrow"><label htmlFor="phone">ফোন নম্বর</label><input id="phone" type="tel" autoComplete="tel" required pattern="01[3-9][0-9]{8}" title="১১ সংখ্যার বাংলাদেশি মোবাইল নম্বর লিখুন" placeholder="01XXXXXXXXX"/></div>
 {modal.mode!=='login'&&<div className="formrow"><label htmlFor="class">ক্লাস</label><select id="class">{['Class 6','Class 7','Class 8','Class 9','Class 10','HSC 1st Year (Science)','HSC 2nd Year (Science)'].map(c=><option key={c}>{c}</option>)}</select></div>}
 <button className="btn primary" type="submit" style={{width:'100%'}}>{modal.mode==='login'?'Preview Login →':'Submit Demo Request →'}</button>
 </form><p>Demo only: No information is sent to a server.</p></dialog>}</>;
}
function ReactElement(Tag,props,children){return <Tag {...props}>{children}</Tag>}

