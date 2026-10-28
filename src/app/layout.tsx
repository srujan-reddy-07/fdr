import type { Metadata } from "next";
import "./globals.css";
export const metadata:Metadata={title:"FDR-Track | AICTE Regulation Bureau",description:"Security Deposit and FDR lifecycle management prototype"};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>}
