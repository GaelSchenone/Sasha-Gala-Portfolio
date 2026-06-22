import { useState } from "react";
import { ChevronDown, X } from 'lucide-react';


export function NavButton({fill, wd, ht, className, Show, setShow}){
    return( 
        <>
            <button onClick={() => setShow(!Show)} className={className}>
                {Show ? <X size={ht} strokeWidth={1.5} /> : <ChevronDown size={ht} strokeWidth={1.5} />}
            </button>
        </>
    )
}