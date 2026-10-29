"use client";
import type { ChangeEvent, FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import {AlertTriangle,Check,LoaderCircle,UploadCloud,X} from "lucide-react";
import {graphqlRequest} from "@/lib/graphql";
import {uploadAdminFile} from "@/lib/admin-upload";
export type ProductCondition="BRAND_NEW"|"UK_USED"|"PREMIUM_REPACK";
export type ConditionRow={id?:string;condition:ProductCondition;price:number;salePrice:number|null;stock:number;isAvailable:boolean;images:string[]};
export type Product={id:string;name:string;slug:string;sku:string;description:string;categoryId:string|null;subcategoryId:string|null;brandId:string|null;category:{id:string;name:string}|null;subcategory:{id:string;name:string}|null;brand:{id:string;name:string}|null;conditions:ConditionRow[];createdAt:string;updatedAt:string};
type Props={product?:Product|null;onCancel?:()=>void;onSaved:(p:Product)=>void};
const labels:Record<ProductCondition,string>={BRAND_NEW:"Brand New",UK_USED:"UK-Used",PREMIUM_REPACK:"Premium-Repack / Refurbished"};
const fields="id name slug sku description categoryId subcategoryId brandId category{id name} subcategory{id name} brand{id name} createdAt updatedAt conditions{id condition price salePrice stock isAvailable images}";
const fresh=(condition:ProductCondition):ConditionRow=>({condition,price:0,salePrice:null,stock:0,isAvailable:true,images:[]});
export default function ProductEditor({product,onCancel,onSaved}:Props){
 const [name,setName]=useState(product?.name||""),[sku,setSku]=useState(product?.sku||""),[description,setDescription]=useState(product?.description||"");
 const [categoryId,setCategoryId]=useState(product?.categoryId||""),[subcategoryId,setSubcategoryId]=useState(product?.subcategoryId||""),[brandId,setBrandId]=useState(product?.brandId||"");
 const [categories,setCategories]=useState<{id:string;name:string}[]>([]),[subcategories,setSubcategories]=useState<{id:string;name:string;categoryId?:string|null}[]>([]),[brands,setBrands]=useState<{id:string;name:string}[]>([]);
 const [conditions,setConditions]=useState<ConditionRow[]>(product?.conditions?.length?product.conditions.map(c=>({...c,images:[...(c.images||[])]})): [fresh("BRAND_NEW")]);
 const [duplicate,setDuplicate]=useState(""),[checking,setChecking]=useState(false),[saving,setSaving]=useState(false),[uploadingImages,setUploadingImages]=useState(false),[error,setError]=useState("");
 useEffect(()=>{Promise.all([graphqlRequest<{categories:{id:string;name:string}[]}>("query{categories{id name}}"),graphqlRequest<{subcategories:{id:string;name:string;categoryId?:string|null}[]}>("query{subcategories{id name categoryId}}"),graphqlRequest<{brands:{id:string;name:string}[]}>("query{brands{id name}}")]).then(([c,s,b])=>{setCategories(c.categories);setSubcategories(s.subcategories);setBrands(b.brands)}).catch(e=>setError(e instanceof Error?e.message:"Could not load options."))},[]);
 useEffect(()=>{if(!name.trim()){setDuplicate("");return}let cancelled=false;setChecking(true);const timer=setTimeout(async()=>{try{const r=await graphqlRequest<{productNameExists:{exists:boolean}}>("query CheckName($name:String!,$excludeId:ID){productNameExists(name:$name,excludeId:$excludeId){exists name}}",{name:name.trim(),excludeId:product?.id||null});if(!cancelled)setDuplicate(r.productNameExists.exists?"A product with this name already exists. Choose another name or edit the existing product.":"")}catch{if(!cancelled)setDuplicate("")}finally{if(!cancelled)setChecking(false)}},400);return()=>{cancelled=true;clearTimeout(timer)}},[name,product?.id]);
 const visibleSubs=useMemo(()=>subcategories.filter(s=>!s.categoryId||!categoryId||s.categoryId===categoryId),[subcategories,categoryId]);
 function toggle(c:ProductCondition,on:boolean){setConditions(old=>on?[...old,fresh(c)]:old.filter(x=>x.condition!==c))}
 function patch(c:ProductCondition,p:Partial<Omit<ConditionRow,"condition">>){setConditions(old=>old.map(x=>x.condition===c?{...x,...p,condition:x.condition}:x))}
 async function addImages(c:ProductCondition,e:ChangeEvent<HTMLInputElement>){
  const files=Array.from(e.target.files||[]);e.target.value="";
  const row=conditions.find(x=>x.condition===c);if(!row||!files.length)return;
  if(files.length+row.images.length>6){setError("Maximum six images per condition.");return}
  if(files.some(f=>!["image/jpeg","image/png","image/webp","image/gif","image/avif"].includes(f.type))){setError("Use JPG, PNG, WebP, GIF or AVIF images.");return}
  setUploadingImages(true);setError("");
  try{const uploaded=await Promise.all(files.map(uploadAdminFile));patch(c,{images:[...row.images,...uploaded.map(file=>file.url)]})}
  catch(error){setError(error instanceof Error?error.message:"Could not upload product images.")}
  finally{setUploadingImages(false)}
 }
  async function submit(e:FormEvent){
    e.preventDefault();setError("");
    if(duplicate){setError(duplicate);return}
    if(!conditions.length){setError("Select at least one condition.");return}
    if(conditions.some(c=>c.salePrice!==null&&c.salePrice>c.price)){setError("Sale price cannot exceed regular price.");return}
    setSaving(true);
    const input={name:name.trim(),sku:sku.trim()||undefined,description:description.trim(),categoryId:categoryId||null,subcategoryId:subcategoryId||null,brandId:brandId||null,conditions:conditions.map(c=>({...c,price:Math.max(0,Math.floor(Number(c.price)||0)),stock:Math.max(0,Math.floor(Number(c.stock)||0)),salePrice:c.salePrice?Math.max(0,Math.floor(Number(c.salePrice))):null}))};
    try{
      let saved:Product;
      if(product){
        const r=await graphqlRequest<{updateProduct:Product}>("mutation Update($id:ID!,$input:ProductInput!){updateProduct(id:$id,input:$input){"+fields+"}}",{id:product.id,input});
        saved=r.updateProduct;
      }else{
        const r=await graphqlRequest<{createProduct:Product}>("mutation Create($input:ProductInput!){createProduct(input:$input){"+fields+"}}",{input});
        saved=r.createProduct;
      }
      onSaved(saved);
    }catch(e){setError(e instanceof Error?e.message:"Could not save product.")}
    finally{setSaving(false)}
  }
 return <form className="product-editor" onSubmit={submit}>
 <section className="product-editor-section"><div className="product-editor-section-title"><span>01</span><div><h3>Product information</h3><p>Details shared across all conditions.</p></div></div><div className="product-editor-grid">
 <label className="product-field product-field-wide">Product name <span>*</span><input required maxLength={180} value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. Samsung Galaxy A55"/>{checking&&<small className="product-field-hint">Checking for duplicate names…</small>}{duplicate&&<small className="product-duplicate"><AlertTriangle size={14}/>{duplicate}</small>}</label>
 <label className="product-field">SKU / product code<input value={sku} onChange={e=>setSku(e.target.value)} placeholder="Auto-generated if blank"/></label>
 <label className="product-field">Brand<select value={brandId} onChange={e=>setBrandId(e.target.value)}><option value="">Select brand</option>{brands.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
 <label className="product-field">Category<select value={categoryId} onChange={e=>{setCategoryId(e.target.value);setSubcategoryId("")}}><option value="">Select category</option>{categories.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
 <label className="product-field">Subcategory<select value={subcategoryId} onChange={e=>setSubcategoryId(e.target.value)}><option value="">Select subcategory</option>{visibleSubs.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
 <label className="product-field product-field-wide">Description<textarea rows={3} value={description} onChange={e=>setDescription(e.target.value)} placeholder="Product features and specifications…"/></label>
 </div></section>
 <section className="product-editor-section"><div className="product-editor-section-title"><span>02</span><div><h3>Available conditions</h3><p>Each condition has its own price, stock and photos.</p></div></div>
 <div className="product-condition-checks">{(["BRAND_NEW","UK_USED","PREMIUM_REPACK"] as ProductCondition[]).map(c=><label key={c} className={"product-condition-check "+(conditions.some(x=>x.condition===c)?"selected":"")}><input type="checkbox" checked={conditions.some(x=>x.condition===c)} onChange={e=>toggle(c,e.target.checked)}/><span className="product-condition-checkmark">{conditions.some(x=>x.condition===c)?"✓":""}</span><span><b>{labels[c]}</b><small>{c==="BRAND_NEW"?"Factory new":c==="UK_USED"?"Pre-owned / imported used":"Refurbished or premium repack"}</small></span></label>)}</div>
 {conditions.map((c,i)=><section className="product-condition-panel" key={c.condition}><div className="product-condition-panel-head"><div><span className="product-condition-number">0{i+1}</span><div><h4>{labels[c.condition]}</h4><p>Condition-specific inventory and photos.</p></div></div><span className="product-condition-active">Enabled</span></div>
 <div className="product-editor-grid product-editor-grid-3"><label className="product-field">Price (UGX) <span>*</span><input type="number" min="0" step="1" required value={c.price} onChange={e=>patch(c.condition,{price:Math.max(0,Number(e.target.value)||0)})}/></label><label className="product-field">Sale price (UGX)<input type="number" min="0" step="1" value={c.salePrice??""} onChange={e=>patch(c.condition,{salePrice:e.target.value===""?null:Math.max(0,Number(e.target.value)||0)})} placeholder="Optional"/></label><label className="product-field">Stock quantity <span>*</span><input type="number" min="0" step="1" required value={c.stock} onChange={e=>patch(c.condition,{stock:Math.max(0,Math.floor(Number(e.target.value)||0)),isAvailable:Number(e.target.value)>0})}/></label></div>
 <div className="product-images-heading"><div><b>Condition photos</b><small>JPG, PNG, WebP, GIF or AVIF · maximum 6 images</small></div><span>{c.images.length}/6</span></div>
 <div className="product-image-grid">{c.images.map((src,n)=><div className="product-image-preview" key={src.slice(0,32)+n}><img src={src} alt={labels[c.condition]+" product image "+(n+1)}/><button type="button" onClick={()=>patch(c.condition,{images:c.images.filter((_,i)=>i!==n)})} aria-label="Remove image"><X size={14}/></button><small>{n===0?"Main image":"Image "+(n+1)}</small></div>)}{c.images.length<6&&<label className="product-image-upload"><input type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/avif" multiple disabled={uploadingImages} onChange={e=>void addImages(c.condition,e)}/><UploadCloud size={22}/><b>{uploadingImages?"Uploading…":"Upload images"}</b><small>{uploadingImages?"Saving to GitHub":`${6-c.images.length} remaining`}</small></label>}</div>
 <label className="product-availability-toggle"><input type="checkbox" checked={c.isAvailable} onChange={e=>patch(c.condition,{isAvailable:e.target.checked})}/><span><b>Available for purchase</b><small>Turn off to hide this condition without deleting it.</small></span></label>
 </section>)}
 {!conditions.length&&<div className="product-form-warning">Select at least one condition to continue.</div>}</section>
 {error&&<div className="product-form-error"><AlertTriangle size={16}/><span>{error}</span><button type="button" onClick={()=>setError("")}><X size={14}/></button></div>}
 <div className="product-editor-footer"><div><b>{conditions.length} condition{conditions.length===1?"":"s"} selected</b><small>Stock and photos are tracked independently.</small></div><div>{onCancel&&<button type="button" className="product-secondary-btn" disabled={saving} onClick={onCancel}>Cancel</button>}<button className="product-save-btn" disabled={saving||!!duplicate||checking||!conditions.length}>{saving?<LoaderCircle className="animate-spin" size={16}/>:<Check size={16}/>} {saving?"Saving…":product?"Save changes":"Create product"}</button></div></div>
 </form>
}