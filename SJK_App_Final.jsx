import { useState } from "react";

/* ─── KONFIGURASI LOKASI KANTOR SJK ─────────────────────────────────────────
   UPDATE koordinat di bawah sesuai link Google Maps yang diberikan.
   Dari: https://maps.app.goo.gl/C6eJjozzwiPG6vXM9
   (Buka link di browser → titik koordinat muncul di URL setelah redirect)
*/
const OFFICE_LAT  = -6.132316;  // Kantor SJK — dari maps.app.goo.gl/C6eJjozzwiPG6vXM9
const OFFICE_LNG  = 106.7288165; // Kantor SJK — dari maps.app.goo.gl/C6eJjozzwiPG6vXM9
const OFFICE_RADIUS_M = 300;
const OFFICE_ADDR = "Jl. Puri Kencana Raya Blok K6-5N Lt.4, Kembangan, Jakarta Barat 11610";

const LOGO = "https://www.struclab.co.id/wp-content/uploads/2022/12/Logo-Small.png";

const C = {
  blue1: "#1958A5", blue2: "#1A6BBF", blue3: "#E8F0FB",
  blue4: "#C8DBF5", blue5: "#F0F6FF", white: "#FFFFFF",
  gray1: "#F5F8FE", gray2: "#EEF3FB", gray3: "#6B82A0",
  gray4: "#94A8C0", dark: "#1A2B4A", red: "#DC2626",
  green: "#16A34A", amber: "#D97706",
};

const SNI = {
  "SNI 2847:2019": {
    sub: "Persyaratan Beton Struktural untuk Bangunan Gedung", color: C.blue1,
    items: [
      {ps:"9.6.1.2",  t:"As minimum balok",       f:"As_min = max(0.25√fc/fy·bw·d,  1.4/fy·bw·d)",  n:"Berlaku semua balok lentur"},
      {ps:"9.3.3.1",  t:"As maksimum SRPMK",      f:"As_max = 0.025 · bw · d",                       n:"Batas atas tulangan tarik"},
      {ps:"18.6.3.1", t:"As min tumpuan SRPMK",   f:"As_tump ≥ max(As_min Ps.9.6, As_lap/4)",        n:"Khusus balok SRPMK"},
      {ps:"18.6.4.1", t:"Zona sengkang gempa",    f:"L_zona = max(2h, ln/4, 500mm) dari muka kolom", n:"Sengkang rapat di zona ini"},
      {ps:"18.6.4.4", t:"Spasi sengkang tumpuan", f:"s ≤ min(d/4, 6·db_long, 150mm)",                n:"Di zona 2h dari muka kolom"},
      {ps:"18.7.3",   t:"SCWB",                   f:"ΣMnc ≥ (6/5) · ΣMnb",                           n:"Kuat kolom > kuat balok"},
      {ps:"22.5.5.1", t:"Kuat geser Vc",          f:"Vc = 0.17·λ·√fc·bw·d  (=0 zona gempa SRPMK)",  n:"Vc=0 untuk zona sengkang"},
      {ps:"22.5.8.5", t:"Kuat geser sengkang Vs", f:"Vs = Av·fy·d / s",                              n:"Av = luas total kaki sengkang"},
      {ps:"25.2.1",   t:"Jarak bersih tulangan",  f:"s_bersih ≥ max(25mm, db, 4/3·agg_max)",         n:"Antar sisi terluar batang"},
      {ps:"20.2.2.4", t:"Faktor φ kekuatan",      f:"φ lentur=0.90 | φ geser=0.75 | φ tekan=0.65",  n:"Digunakan engine SJKRebarPro"},
    ]
  },
  "SNI 1726:2019": {
    sub: "Tata Cara Perencanaan Ketahanan Gempa", color: "#B45309",
    items: [
      {ps:"6.2",   t:"Kategori Risiko",         f:"KR I–IV berdasarkan fungsi bangunan",   n:"KR IV = fasilitas esensial"},
      {ps:"7.3",   t:"Kategori Desain Seismik", f:"KDS A–F dari SDS, SD1, dan KR",         n:"KDS D/E/F → wajib SRPMK"},
      {ps:"7.5.1", t:"Parameter SRPMK",         f:"R=8 | Ω₀=3 | Cd=5.5",                  n:"Untuk KDS D, E, F"},
      {ps:"Ps.14", t:"Detail beton SRPMK",      f:"Mengacu SNI 2847:2019 Pasal 18",        n:"Harus dipenuhi KDS ≥ D"},
    ]
  },
  "SNI 1727:2020": {
    sub: "Beban Desain Minimum untuk Bangunan Gedung", color: "#166534",
    items: [
      {ps:"3",     t:"Beban mati (D)",     f:"Berat sendiri + komponen permanen",                   n:"Dari berat satuan material"},
      {ps:"4.3.2", t:"Beban hidup lantai", f:"Kantor=2.40 | Apartemen=1.92 | Parkir=2.40  kN/m²", n:"Nilai minimum SNI"},
      {ps:"2.3.1", t:"Kombinasi LRFD",     f:"1.4D | 1.2D+1.6L | 1.2D+1.0E+L | 0.9D+1.0E",       n:"Ambil efek terbesar"},
    ]
  }
};

const TABS = [
  {id:"login",    label:"Login",          icon:"🔐"},
  {id:"project",  label:"Project Setup",  icon:"📁"},
  {id:"config",   label:"Parameter",      icon:"⚙️"},
  {id:"flexural", label:"Longitudinal",   icon:"🔩"},
  {id:"shear",    label:"Shear",          icon:"⬡"},
  {id:"output",   label:"Output",         icon:"📦"},
];
const ROLES = ["Owner","Admin","Senior Engineer","Junior Engineer"];
const DIAMETERS = [10,13,16,19,22,25];

function haversineM(lat1,lng1,lat2,lng2) {
  const R=6371000,toR=Math.PI/180,dLat=(lat2-lat1)*toR,dLng=(lng2-lng1)*toR;
  const a=Math.sin(dLat/2)**2+Math.cos(lat1*toR)*Math.cos(lat2*toR)*Math.sin(dLng/2)**2;
  return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
}
function useGPS() {
  const [gps,setGps]=useState({status:"idle",lat:null,lng:null,dist:null});
  const check=()=>{
    setGps(p=>({...p,status:"checking"}));
    if(!navigator.geolocation){setGps({status:"unsupported",lat:null,lng:null,dist:null});return;}
    navigator.geolocation.getCurrentPosition(
      pos=>{const d=haversineM(pos.coords.latitude,pos.coords.longitude,OFFICE_LAT,OFFICE_LNG);
        setGps({status:d<=OFFICE_RADIUS_M?"ok":"outside",lat:pos.coords.latitude,lng:pos.coords.longitude,dist:Math.round(d)});},
      ()=>setGps({status:"denied",lat:null,lng:null,dist:null})
    );
  };
  return {gps,check};
}

function GoogleDrivePicker({onPick}) {
  const [open,setOpen]=useState(false);
  const files=[
    {name:"02_8_24_MODEL_UPP_STR_FINAL_UPDATE.et", size:"2.4 MB",date:"28 Mei 2026"},
    {name:"Flexural_Reinf_v2.xlsx",                 size:"1.1 MB",date:"28 Mei 2026"},
    {name:"Shear_Reinf_v2.xlsx",                    size:"0.9 MB",date:"28 Mei 2026"},
  ];
  return (
    <div>
      <button onClick={()=>setOpen(o=>!o)} style={{display:"inline-flex",alignItems:"center",gap:8,padding:"8px 16px",borderRadius:8,border:`1px solid ${C.blue4}`,background:C.white,color:C.blue1,fontSize:13,fontWeight:600,cursor:"pointer"}}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <path d="M12 2L2 19h7l3-5 3 5h7L12 2z" fill="#4285F4"/>
          <path d="M2 19h9l-4.5-8L2 19z" fill="#FBBC05"/>
          <path d="M13 19h9l-4.5-8L13 19z" fill="#34A853"/>
        </svg>
        Import dari Google Drive
      </button>
      {open&&(
        <div style={{marginTop:8,border:`1px solid ${C.blue4}`,borderRadius:10,overflow:"hidden"}}>
          <div style={{padding:"10px 14px",background:C.blue3,fontSize:11,fontWeight:700,color:C.blue1,letterSpacing:"0.08em",textTransform:"uppercase"}}>📂 Google Drive — SJK Folder</div>
          {files.map(f=>(
            <div key={f.name} onClick={()=>{onPick(f);setOpen(false);}} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 14px",borderTop:`1px solid ${C.gray2}`,cursor:"pointer",background:C.white}}
              onMouseEnter={e=>e.currentTarget.style.background=C.blue5}
              onMouseLeave={e=>e.currentTarget.style.background=C.white}>
              <span style={{fontSize:20}}>📄</span>
              <div style={{flex:1}}><div style={{fontSize:13,color:C.dark,fontFamily:"monospace"}}>{f.name}</div><div style={{fontSize:11,color:C.gray3}}>{f.size} · {f.date}</div></div>
              <span style={{fontSize:11,color:C.blue1,fontWeight:600}}>Pilih</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const St = {
  app:    {minHeight:"100vh",background:C.gray1,color:C.dark,fontFamily:"'Segoe UI',Arial,sans-serif",display:"flex",flexDirection:"column"},
  hdr:    {background:C.white,borderBottom:`1px solid ${C.blue4}`,padding:"0 28px",display:"flex",alignItems:"center",gap:14,height:60,flexShrink:0,boxShadow:"0 1px 4px #1958A512"},
  main:   {display:"flex",flex:1,overflow:"hidden"},
  side:   {width:210,background:C.white,borderRight:`1px solid ${C.blue4}`,padding:"20px 0",flexShrink:0,overflowY:"auto"},
  body:   {flex:1,padding:"28px 36px",overflowY:"auto"},
  card:   {background:C.white,border:`1px solid ${C.blue4}`,borderRadius:12,padding:"20px 24px",marginBottom:18,boxShadow:"0 1px 3px #1958A508"},
  ctitle: {fontSize:11,fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",color:C.blue1,marginBottom:16,display:"flex",alignItems:"center",gap:8},
  lbl:    {display:"block",fontSize:12,color:C.gray3,marginBottom:5,fontWeight:500},
  hint:   {fontSize:11,color:C.gray4,marginTop:4},
  inp:    {width:"100%",boxSizing:"border-box",padding:"8px 12px",borderRadius:8,border:`1px solid ${C.blue4}`,background:C.white,color:C.dark,fontSize:13,outline:"none"},
  sel:    {padding:"8px 12px",borderRadius:8,border:`1px solid ${C.blue4}`,background:C.white,color:C.dark,fontSize:13,outline:"none",cursor:"pointer"},
  g2:     {display:"grid",gridTemplateColumns:"1fr 1fr",gap:16},
  g3:     {display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:14},
  btnPri: {padding:"10px 22px",borderRadius:8,border:"none",background:C.blue1,color:C.white,fontSize:13,fontWeight:600,cursor:"pointer"},
  btnSec: {padding:"9px 18px",borderRadius:8,border:`1px solid ${C.blue4}`,background:C.white,color:C.blue1,fontSize:13,cursor:"pointer",fontWeight:500},
  btnGrn: {padding:"10px 22px",borderRadius:8,border:"none",background:"#15803D",color:C.white,fontSize:13,fontWeight:600,cursor:"pointer"},
  tabBtn: (a,l)=>({width:"100%",padding:"9px 18px",border:"none",background:a?C.blue3:"transparent",color:a?C.blue1:l?C.gray4:C.gray3,textAlign:"left",cursor:l?"not-allowed":"pointer",fontSize:12,fontWeight:a?700:400,borderLeft:a?`3px solid ${C.blue1}`:"3px solid transparent",transition:"all 0.12s",display:"flex",alignItems:"center",gap:8}),
  tag:    (on)=>({padding:"4px 12px",borderRadius:20,border:`1px solid ${on?C.blue1:C.blue4}`,background:on?C.blue1:C.white,color:on?C.white:C.gray3,fontSize:12,fontFamily:"monospace",cursor:"pointer",transition:"all 0.12s"}),
  drop:   (h)=>({border:`2px dashed ${h?C.blue1:C.blue4}`,borderRadius:12,padding:"36px 20px",textAlign:"center",cursor:"pointer",background:h?C.blue5:C.gray1,transition:"all 0.15s"}),
  badge:  (c)=>({padding:"2px 8px",borderRadius:20,background:c==="g"?"#DCFCE7":c==="r"?"#FEE2E2":C.blue3,color:c==="g"?"#15803D":c==="r"?"#DC2626":C.blue1,fontSize:11,fontWeight:700}),
  gpsBox: (s)=>({padding:"10px 14px",borderRadius:8,background:s==="ok"?"#F0FDF4":s==="outside"?"#FEF9C3":C.blue5,border:`1px solid ${s==="ok"?"#86EFAC":s==="outside"?"#FDE047":C.blue4}`,fontSize:12,color:s==="ok"?C.green:s==="outside"?C.amber:C.blue1,display:"flex",alignItems:"center",gap:8}),
  info:   (c)=>({padding:"10px 14px",borderRadius:8,background:c==="r"?"#FEF2F2":c==="g"?"#F0FDF4":c==="y"?"#FFFBEB":C.blue5,border:`1px solid ${c==="r"?"#FECACA":c==="g"?"#BBF7D0":c==="y"?"#FDE68A":C.blue4}`,fontSize:12,color:c==="r"?C.red:c==="g"?C.green:c==="y"?C.amber:C.blue1,marginBottom:10}),
  th:     {padding:"9px 12px",background:C.blue3,color:C.blue1,fontWeight:700,fontSize:11,textAlign:"left",letterSpacing:"0.05em",borderBottom:`1px solid ${C.blue4}`},
  td:     {padding:"8px 12px",borderBottom:`1px solid ${C.gray2}`,color:C.dark,fontSize:13},
};

function Card({title,icon,children,style={}}) {return <div style={{...St.card,...style}}><div style={St.ctitle}><span>{icon}</span>{title}</div>{children}</div>;}
function F({label,hint,full,children}) {return (<div style={{marginBottom:14,gridColumn:full?"1/-1":undefined}}><label style={St.lbl}>{label}</label>{children}{hint&&<div style={St.hint}>{hint}</div>}</div>);}
function Info({c="b",children}) {return <div style={St.info(c)}>{children}</div>;}
function GPSStatus({gps,onCheck}) {
  const icons={ok:"✅",outside:"⚠️",denied:"❌",checking:"⏳",unsupported:"❓",idle:"📍"};
  const msgs={ok:`Lokasi terverifikasi (${gps.dist}m dari kantor)`,outside:`Di luar area kantor (${gps.dist}m — maks ${OFFICE_RADIUS_M}m)`,denied:"Izin GPS ditolak browser",checking:"Memeriksa lokasi...",unsupported:"Browser tidak support GPS",idle:"Belum dicek"};
  return (<div style={St.gpsBox(gps.status)}><span>{icons[gps.status]||"📍"}</span><span style={{flex:1}}>{msgs[gps.status]}</span>{gps.status!=="checking"&&<button onClick={onCheck} style={{...St.btnSec,padding:"4px 10px",fontSize:11}}>Cek GPS</button>}</div>);
}

function TabLogin({onLogin}) {
  const [role,setRole]=useState(""), [step,setStep]=useState(1);
  const [pw,setPw]=useState(""), [name,setName]=useState("");
  const [otpSent,setOtpSent]=useState(false);
  const [regOpen,setRegOpen]=useState(false), [regSent,setRegSent]=useState(false);
  const {gps,check}=useGPS();
  const isEng=role.includes("Engineer");
  const gpsOk=gps.status==="ok";
  const ownerEmail="a.sunjaya01@struclab.co.id", adminEmail="admin@struclab.co.id";

  return (
    <div style={{maxWidth:460,margin:"0 auto",paddingTop:12}}>
      <div style={{textAlign:"center",marginBottom:28}}>
        <img src={LOGO} alt="SJK" style={{height:72,marginBottom:10,objectFit:"contain"}}
          onError={e=>{e.target.style.display="none";}} />
        <div style={{fontSize:22,fontWeight:700,color:C.dark}}>SJK-ETABSRebarPro</div>
        <div style={{fontSize:12,color:C.gray3}}>PT Struclab Jaya Konsultindo</div>
      </div>

      {step===1&&(
        <Card title="PILIH PERAN ANDA" icon="👤">
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:16}}>
            {ROLES.map(r=>(<button key={r} onClick={()=>setRole(r)} style={{padding:"12px 10px",borderRadius:10,border:`2px solid ${role===r?C.blue1:C.gray2}`,background:role===r?C.blue3:C.white,color:role===r?C.blue1:C.gray3,fontSize:12,fontWeight:600,cursor:"pointer",textAlign:"center",transition:"all 0.12s"}}>{r}</button>))}
          </div>
          <button style={{...St.btnPri,width:"100%",opacity:role?1:0.4}} onClick={()=>role&&setStep(2)}>Lanjut →</button>
          <div style={{textAlign:"center",marginTop:12}}>
            <button onClick={()=>setRegOpen(o=>!o)} style={{background:"none",border:"none",color:C.blue1,fontSize:12,cursor:"pointer",textDecoration:"underline"}}>Belum terdaftar? Hubungi kami</button>
          </div>
          {regOpen&&(
            <div style={{...St.card,marginTop:14,marginBottom:0,background:C.blue5}}>
              <div style={St.ctitle}><span>✉️</span>DAFTAR AKSES</div>
              <Info c="b">Kirim email ke alamat berikut. Sertakan nama lengkap, jabatan, dan nomor telepon.</Info>
              {[{role:"Owner",email:ownerEmail,hint:"Hubungi langsung owner SJK"},{role:"Admin / Engineer",email:adminEmail,hint:"Pendaftaran & approval akses"}].map(({role:r,email,hint})=>(
                <div key={r} style={{padding:"12px 14px",borderRadius:8,border:`1px solid ${C.blue4}`,background:C.white,marginBottom:8}}>
                  <div style={{fontSize:11,fontWeight:700,color:C.blue1,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:4}}>{r}</div>
                  <div style={{fontFamily:"monospace",fontSize:13,color:C.dark,marginBottom:2}}>{email}</div>
                  <div style={{fontSize:11,color:C.gray3}}>{hint}</div>
                </div>
              ))}
              {!regSent?<button style={{...St.btnPri,width:"100%",marginTop:4}} onClick={()=>setRegSent(true)}>Kirim Permintaan Pendaftaran</button>:<Info c="g">✓ Tim SJK akan menghubungi Anda dalam 1×24 jam kerja.</Info>}
            </div>
          )}
        </Card>
      )}

      {step===2&&!isEng&&(
        <Card title={`LOGIN — ${role.toUpperCase()}`} icon="🔐">
          <F label="Password"><input type="password" value={pw} onChange={e=>setPw(e.target.value)} placeholder="Masukkan password" style={St.inp}/></F>
          <Info c="b">📧 Notifikasi login dikirim ke <strong>{role==="Owner"?ownerEmail:adminEmail}</strong></Info>
          <button style={{...St.btnPri,width:"100%",opacity:pw?1:0.4}} onClick={()=>pw&&onLogin(role)}>Login</button>
          <button style={{...St.btnSec,width:"100%",marginTop:8}} onClick={()=>{setStep(1);setRole("");}}>← Kembali</button>
        </Card>
      )}

      {step===2&&isEng&&(
        <Card title="ENGINEER — MINTA AKSES" icon="🔐">
          <F label="Nama Anda (sesuai database SJK)"><input value={name} onChange={e=>setName(e.target.value)} placeholder="Nama lengkap" style={St.inp}/></F>
          {!otpSent?(
            <><Info c="b">Klik tombol → OTP dikirim ke <strong>{adminEmail}</strong>. Admin teruskan kode ke Anda.</Info>
            <button style={{...St.btnPri,width:"100%",opacity:name?1:0.4}} onClick={()=>name&&setOtpSent(true)}>Minta Akses (Kirim OTP ke Admin)</button></>
          ):(
            <><Info c="g">✓ Email terkirim ke {adminEmail}. Tunggu kode OTP dari Admin (berlaku 15 menit).</Info>
            <F label="Kode OTP dari Admin"><input placeholder="● ● ● ● ● ●" style={{...St.inp,letterSpacing:"0.3em",textAlign:"center",fontSize:20}}/></F>
            <F label="Verifikasi Lokasi" hint={OFFICE_ADDR}><GPSStatus gps={gps} onCheck={check}/></F>
            <button style={{...St.btnPri,width:"100%",marginTop:4,opacity:gpsOk?1:0.5}} onClick={()=>gpsOk&&onLogin(role)}>Verifikasi & Masuk</button></>
          )}
          <button style={{...St.btnSec,width:"100%",marginTop:8}} onClick={()=>{setStep(1);setRole("");}}>← Kembali</button>
        </Card>
      )}
    </div>
  );
}

function TabProject({onDone}) {
  const [name,setName]=useState(""), [parsed,setParsed]=useState(false);
  const [loading,setLoading]=useState(false), [driveFile,setDriveFile]=useState(null), [hover,setHover]=useState(false);
  const doUpload=()=>{if(parsed)return;setLoading(true);setTimeout(()=>{setLoading(false);setParsed(true);},1500);};
  const handleDrive=f=>{setDriveFile(f);setLoading(true);setTimeout(()=>{setLoading(false);setParsed(true);},1200);};
  return (
    <div>
      <h2 style={{fontSize:20,fontWeight:700,color:C.dark,marginBottom:22}}>Project Setup</h2>
      <Card title="INFORMASI PROJECT" icon="📋">
        <div style={St.g2}>
          <F label="Nama Project"><input value={name} onChange={e=>setName(e.target.value)} placeholder="cth: Gedung XYZ Lt.8" style={St.inp}/></F>
          <F label="No. Project" hint="Otomatis dari database"><input readOnly value="SJK-2024-042" style={{...St.inp,color:C.gray3}}/></F>
          <F label="Engineer PIC"><input readOnly value="Budi Santoso (Senior Engineer)" style={{...St.inp,color:C.gray3}}/></F>
          <F label="Tanggal"><input readOnly value="29 Mei 2026, 14:32 WIB" style={{...St.inp,color:C.gray3}}/></F>
        </div>
      </Card>
      <Card title="UPLOAD FILE $ET / E2K" icon="📂">
        <div style={{marginBottom:12}}><GoogleDrivePicker onPick={handleDrive}/></div>
        <div style={{fontSize:11,color:C.gray3,textAlign:"center",marginBottom:10}}>— atau upload dari komputer —</div>
        <div style={St.drop(hover)} onClick={doUpload} onDragOver={e=>{e.preventDefault();setHover(true);}} onDragLeave={()=>setHover(false)} onDrop={e=>{e.preventDefault();setHover(false);doUpload();}}>
          {!loading&&!parsed&&<><div style={{fontSize:38,marginBottom:8}}>📁</div><div style={{fontSize:13,color:C.gray3}}>Drag & drop file .et atau .e2k</div><div style={{fontSize:11,color:C.gray4,marginTop:4}}>ETABS v22+ | klik untuk browse</div></>}
          {loading&&<><div style={{fontSize:32}}>⏳</div><div style={{fontSize:13,color:C.blue1,marginTop:8}}>Mem-parse file $ET...</div></>}
          {!loading&&parsed&&<><div style={{fontSize:32}}>✅</div><div style={{fontSize:13,color:C.green,fontWeight:600,marginTop:6}}>{driveFile?driveFile.name:"02_8_24_MODEL_UPP_STR.et"}</div><div style={{fontSize:12,color:C.gray3,marginTop:4}}>Parse selesai dalam 2.3 detik</div></>}
        </div>
        {parsed&&(
          <><div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginTop:12}}>
            {[["Stories","8 aktif"],["Balok","215 frame"],["Kolom","30 frame"],["Material","fc30/fy420"]].map(([k,v])=>(
              <div key={k} style={{borderRadius:8,padding:"10px 12px",border:`1px solid ${C.blue4}`,background:C.blue5}}><div style={{fontSize:11,color:C.gray3}}>{k}</div><div style={{fontSize:15,fontWeight:700,color:C.blue1}}>{v}</div></div>
            ))}
          </div>
          <div style={{...St.info("r"),marginTop:10}}>⚠️ Section <b>BB</b> (balok tangga) dan <b>KB</b> (kolom tangga pendek) otomatis dikecualikan dari desain</div></>
        )}
      </Card>
      <button style={{...St.btnPri,opacity:(name&&parsed)?1:0.4}} onClick={()=>(name&&parsed)&&onDone()}>Lanjut ke Parameter Desain →</button>
    </div>
  );
}

function TabConfig({onDone}) {
  const [cfg,setCfg]=useState({cover:40,agg:20,diam:[10,13,16,19,22,25],baseMax:19,gMin:13,bMin:10,addMax:22,addMaxB:19,swDiam:10,swTump:100,swRound:25,leg4:250,spz:1});
  const u=(k,v)=>setCfg(p=>({...p,[k]:v}));
  const tog=d=>{const nx=cfg.diam.includes(d)?cfg.diam.filter(x=>x!==d):[...cfg.diam,d].sort((a,b)=>a-b);if(nx.length>=1)u("diam",nx);};
  const storyList=["L2","L3","L4","L5","L6","L7","L8","DECK RF"];
  const zones=()=>{const n=cfg.spz,o=[];for(let i=0;i<storyList.length;i+=n)o.push(storyList.slice(i,i+n));return o;};
  return (
    <div>
      <h2 style={{fontSize:20,fontWeight:700,color:C.dark,marginBottom:22}}>Parameter Desain</h2>
      <Info c="b">💡 Parameter tersimpan bersama project. Dapat diubah sebelum menjalankan engine.</Info>
      <Card title="COVER & AGREGAT" icon="🧱">
        <div style={St.g2}>
          <F label="Selimut beton" hint="ke sisi terluar sengkang — BUKAN cover ke centroid $ET (85mm)">
            <div style={{display:"flex",gap:8,alignItems:"center"}}><input type="number" value={cfg.cover} onChange={e=>u("cover",+e.target.value)} min={20} max={80} step={5} style={{...St.inp,width:80}}/><span style={{fontSize:12,color:C.gray3}}>mm</span></div>
          </F>
          <F label="Agregat maks"><select value={cfg.agg} onChange={e=>u("agg",+e.target.value)} style={St.sel}>{[10,16,20,25,32].map(v=><option key={v} value={v}>{v} mm</option>)}</select></F>
        </div>
      </Card>
      <Card title="TULANGAN LONGITUDINAL" icon="🔩">
        <F label="Diameter diizinkan" hint="klik toggle" full>
          <div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:4}}>{DIAMETERS.map(d=><button key={d} style={St.tag(cfg.diam.includes(d))} onClick={()=>tog(d)}>D{d}</button>)}</div>
        </F>
        <div style={St.g3}>
          <F label="Base maks"><select value={cfg.baseMax} onChange={e=>u("baseMax",+e.target.value)} style={St.sel}>{cfg.diam.map(d=><option key={d} value={d}>D{d}</option>)}</select></F>
          <F label="Min Induk G"><select value={cfg.gMin} onChange={e=>u("gMin",+e.target.value)} style={St.sel}>{cfg.diam.filter(d=>d<=cfg.baseMax).map(d=><option key={d} value={d}>D{d}</option>)}</select></F>
          <F label="Min Anak B"><select value={cfg.bMin} onChange={e=>u("bMin",+e.target.value)} style={St.sel}>{cfg.diam.filter(d=>d<=cfg.baseMax).map(d=><option key={d} value={d}>D{d}</option>)}</select></F>
          <F label="Add maks G" hint="+tumpuan G"><select value={cfg.addMax} onChange={e=>u("addMax",+e.target.value)} style={St.sel}>{cfg.diam.filter(d=>d>=cfg.baseMax).map(d=><option key={d} value={d}>D{d}</option>)}</select></F>
          <F label="Add maks B" hint="+tumpuan B"><select value={cfg.addMaxB} onChange={e=>u("addMaxB",+e.target.value)} style={St.sel}>{cfg.diam.filter(d=>d>=cfg.baseMax).map(d=><option key={d} value={d}>D{d}</option>)}</select></F>
        </div>
      </Card>
      <Card title="SENGKANG" icon="⬡">
        <div style={St.g3}>
          <F label="Diameter sengkang"><select value={cfg.swDiam} onChange={e=>u("swDiam",+e.target.value)} style={St.sel}>{[8,10,13].map(d=><option key={d} value={d}>D{d}</option>)}</select></F>
          <F label="Spasi tumpuan (fixed)" hint="kaki menyesuaikan Avs perlu">
            <div style={{display:"flex",gap:8,alignItems:"center"}}><input type="number" value={cfg.swTump} onChange={e=>u("swTump",+e.target.value)} min={50} max={150} step={25} style={{...St.inp,width:80}}/><span style={{fontSize:12,color:C.gray3}}>mm</span></div>
          </F>
          <F label="Pembulatan lapangan"><select value={cfg.swRound} onChange={e=>u("swRound",+e.target.value)} style={St.sel}>{[5,10,25,50].map(v=><option key={v} value={v}>{v} mm</option>)}</select></F>
          <F label="Threshold kaki 4" hint="b > nilai ini → 4 kaki lapangan">
            <div style={{display:"flex",gap:8,alignItems:"center"}}><input type="number" value={cfg.leg4} onChange={e=>u("leg4",+e.target.value)} min={150} max={450} step={50} style={{...St.inp,width:80}}/><span style={{fontSize:12,color:C.gray3}}>mm</span></div>
          </F>
        </div>
      </Card>
      <Card title="STORY GROUPING" icon="🏢">
        <F label={`Samakan desain per ${cfg.spz} lantai`} hint="1 = tiap lantai mandiri">
          <div style={{display:"flex",alignItems:"center",gap:12,marginTop:4}}>
            <input type="range" min={1} max={8} step={1} value={cfg.spz} onChange={e=>u("spz",+e.target.value)} style={{flex:1,maxWidth:200}}/>
            <span style={{fontSize:20,fontWeight:700,color:C.blue1}}>{cfg.spz}</span>
            <span style={{fontSize:12,color:C.gray3}}>{cfg.spz===1?"tiap lantai":"lantai/zona"}</span>
          </div>
        </F>
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          {zones().map((z,i)=>(
            <div key={i} style={{padding:"4px 12px",borderRadius:6,background:C.blue3,border:`1px solid ${C.blue4}`,fontSize:12,fontFamily:"monospace",color:C.blue1}}>
              <span style={{color:C.gray3}}>Z{i+1} </span>{z.length===1?z[0]:`${z[0]}-${z[z.length-1]}`}
            </div>
          ))}
        </div>
      </Card>
      <button style={St.btnPri} onClick={onDone}>Simpan & Jalankan Desain Longitudinal →</button>
    </div>
  );
}

function TabFlexural({onDone}) {
  const [st,setSt]=useState("idle");
  const rows=[
    {n:"G6-1",s:"G35X70",bh:"350×700",top:"6D19+2D22",bot:"6D19",f:"PASS"},
    {n:"G6-2",s:"G35X70",bh:"350×700",top:"6D19+3D22",bot:"6D19",f:"PASS"},
    {n:"G3-1",s:"G30X60",bh:"300×600",top:"5D19+2D22",bot:"5D19",f:"PASS"},
    {n:"G3-2",s:"G30X60",bh:"300×600",top:"5D19+4D22",bot:"5D19",f:"PASS"},
    {n:"B3-1",s:"B25X40",bh:"250×400",top:"2D16+1D19",bot:"2D16",f:"PASS"},
    {n:"B3-2",s:"B25X40",bh:"250×400",top:"2D16+2D19",bot:"2D16",f:"PASS"},
    {n:"B1-1",s:"B20X40",bh:"200×400",top:"2D16",     bot:"2D16",f:"PASS"},
  ];
  return (
    <div>
      <h2 style={{fontSize:20,fontWeight:700,color:C.dark,marginBottom:22}}>Desain Tulangan Longitudinal</h2>
      <Card title="UPLOAD FLEXURAL EXCEL" icon="📊">
        <div style={{marginBottom:12}}><GoogleDrivePicker onPick={()=>{setSt("running");setTimeout(()=>setSt("done"),1500);}}/></div>
        <div style={{...St.drop(false),cursor:st==="idle"?"pointer":"default"}} onClick={()=>{if(st==="idle"){setSt("running");setTimeout(()=>setSt("done"),1800);}}}>
          {st==="idle"&&<><div style={{fontSize:36,marginBottom:8}}>📊</div><div style={{fontSize:13,color:C.gray3}}>Upload "Concrete Beam Flexure Envelope" dari ETABS</div></>}
          {st==="running"&&<><div style={{fontSize:32}}>⚙️</div><div style={{fontSize:13,color:C.blue1,marginTop:8}}>Menjalankan M2 (Grouping) + M3 (Longitudinal)...</div></>}
          {st==="done"&&<><div style={{fontSize:32}}>✅</div><div style={{fontSize:13,color:C.green,fontWeight:600,marginTop:6}}>Flexural_Reinf_.xlsx — 3356 baris</div><div style={{fontSize:12,color:C.gray3,marginTop:4}}>PASS: 1352/1352 | FAIL: 0</div></>}
        </div>
      </Card>
      {st==="done"&&<>
        <Card title="HASIL GROUPING & TULANGAN" icon="🔩">
          <div style={{overflowX:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
              <thead><tr>{["Group","Section","b×h","Tul. Atas Tump","Tul. Bawah","Flag"].map(h=><th key={h} style={St.th}>{h}</th>)}</tr></thead>
              <tbody>{rows.map((r,i)=>(
                <tr key={r.n} style={{background:i%2===0?C.white:C.gray1}}>
                  <td style={{...St.td,fontWeight:700,color:C.blue1}}>{r.n}</td>
                  <td style={St.td}>{r.s}</td>
                  <td style={{...St.td,fontFamily:"monospace"}}>{r.bh}</td>
                  <td style={{...St.td,fontFamily:"monospace"}}>{r.top}</td>
                  <td style={{...St.td,fontFamily:"monospace"}}>{r.bot}</td>
                  <td style={St.td}><span style={St.badge("g")}>{r.f}</span></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </Card>
        <Card title="LANGKAH SELANJUTNYA" icon="📋">
          <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:16}}>
            {[
              {no:"1",t:"Download file $ET versi 1",d:"Frame section diupdate dengan tulangan longitudinal M3"},
              {no:"2",t:"Upload ke ETABS",d:"Import file .et → replace model lama"},
              {no:"3",t:"Run analisis di ETABS",d:"Dapatkan gaya geser dengan section baru"},
              {no:"4",t:"Export Shear Envelope",d:"Table → Concrete → Beam Shear Envelope → Excel"},
              {no:"5",t:"Kembali ke tab Shear",d:"Upload Shear Excel → M4 + re-grouping final"},
            ].map(s=>(
              <div key={s.no} style={{display:"flex",gap:12,padding:"10px 14px",background:C.gray1,borderRadius:8,border:`1px solid ${C.gray2}`}}>
                <div style={{width:24,height:24,borderRadius:"50%",background:C.blue1,color:C.white,fontSize:12,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{s.no}</div>
                <div><div style={{fontSize:13,fontWeight:600,color:C.dark}}>{s.t}</div><div style={{fontSize:11,color:C.gray3,marginTop:2}}>{s.d}</div></div>
              </div>
            ))}
          </div>
          <button style={St.btnGrn}>⬇️ Download 02_8_24_MODEL_flex_rebar_edit.et</button>
        </Card>
        <button style={St.btnPri} onClick={onDone}>Lanjut ke Tab Shear →</button>
      </>}
    </div>
  );
}

function TabShear({onDone}) {
  const [done,setDone]=useState(false);
  return (
    <div>
      <h2 style={{fontSize:20,fontWeight:700,color:C.dark,marginBottom:8}}>Desain Sengkang</h2>
      <Info c="b">Upload Shear Envelope dari ETABS yang sudah di-run ulang dengan $ET versi 1. Sistem akan run M4 + re-grouping final.</Info>
      <Card title="UPLOAD SHEAR EXCEL" icon="📊">
        <div style={{marginBottom:12}}><GoogleDrivePicker onPick={()=>setTimeout(()=>setDone(true),1000)}/></div>
        <div style={St.drop(false)} onClick={()=>{if(!done)setTimeout(()=>setDone(true),1500);}}>
          {!done?<><div style={{fontSize:36,marginBottom:8}}>📊</div><div style={{fontSize:13,color:C.gray3}}>Upload "Concrete Beam Shear Envelope" dari ETABS</div></>
          :<><div style={{fontSize:32}}>✅</div><div style={{fontSize:13,color:C.green,fontWeight:600,marginTop:6}}>Shear_Reinf_.xlsx — selesai</div><div style={{fontSize:12,color:C.gray3,marginTop:4}}>M4: 1352/1352 PASS | Grouping final selesai</div></>}
        </div>
      </Card>
      {done&&<button style={St.btnPri} onClick={onDone}>Lanjut ke Output →</button>}
    </div>
  );
}

function TabOutput() {
  const [saved,setSaved]=useState(false);
  const files=[
    {n:"SJK_Penulangan_Balok.xlsx",sz:"125 KB",icon:"📗",d:"Semua tipe tulangan + SUMMARY"},
    {n:"SJK_DXF_AllStories.zip",   sz:"152 KB",icon:"📐",d:"Denah per lantai + section per zona"},
    {n:"SJK_Laporan_Ringkas.docx", sz:"28 KB", icon:"📄",d:"Ringkasan desain + FLAG"},
    {n:"SJK_Laporan_Detail.docx",  sz:"147 KB",icon:"📄",d:"Perhitungan lengkap per group"},
  ];
  return (
    <div>
      <h2 style={{fontSize:20,fontWeight:700,color:C.dark,marginBottom:22}}>Output & Download</h2>
      <Card title="FILE TERSEDIA" icon="📦">
        {files.map(f=>(
          <div key={f.n} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 14px",background:C.gray1,borderRadius:8,border:`1px solid ${C.gray2}`,marginBottom:8}}>
            <span style={{fontSize:22}}>{f.icon}</span>
            <div style={{flex:1}}><div style={{fontSize:13,fontFamily:"monospace",color:C.dark}}>{f.n}</div><div style={{fontSize:11,color:C.gray3}}>{f.d} · {f.sz}</div></div>
            <div style={{display:"flex",gap:6}}>
              <button style={{...St.btnSec,padding:"5px 12px",fontSize:11}}>☁️ Drive</button>
              <button style={{...St.btnPri,padding:"5px 12px",fontSize:11}}>⬇️</button>
            </div>
          </div>
        ))}
        <button style={{...St.btnPri,width:"100%",marginTop:4}}>⬇️ Download Semua (ZIP)</button>
      </Card>
      <Card title="SAVE PROJECT" icon="💾">
        <div style={{fontFamily:"monospace",fontSize:13,color:C.blue1,padding:"10px 14px",background:C.blue5,borderRadius:8,border:`1px solid ${C.blue4}`,marginBottom:12}}>
          SJKRebarPro_042_GedungXYZ_2026-05-29_WIB
        </div>
        <button style={saved?St.btnGrn:St.btnPri} onClick={()=>setSaved(true)}>
          {saved?"✓ Project Tersimpan":"💾 Simpan Project ke Database"}
        </button>
        {saved&&<Info c="g">Project dapat di-recall kapan saja dari "Buka Project Lama"</Info>}
      </Card>
    </div>
  );
}

function TabSNI() {
  const [active,setActive]=useState("SNI 2847:2019"), [search,setSearch]=useState("");
  const cur=SNI[active];
  const items=cur.items.filter(p=>!search||p.ps.includes(search)||p.t.toLowerCase().includes(search.toLowerCase())||p.f.toLowerCase().includes(search.toLowerCase()));
  return (
    <div>
      <h2 style={{fontSize:20,fontWeight:700,color:C.dark,marginBottom:6}}>Referensi SNI</h2>
      <p style={{fontSize:13,color:C.gray3,marginBottom:18}}>Pasal-pasal acuan desain engine SJK-ETABSRebarPro.</p>
      <div style={{display:"flex",gap:10,marginBottom:18,flexWrap:"wrap"}}>
        {Object.entries(SNI).map(([k,v])=>(<button key={k} onClick={()=>{setActive(k);setSearch("");}} style={{padding:"9px 16px",borderRadius:10,border:`2px solid ${active===k?v.color:C.blue4}`,background:active===k?v.color+"15":C.white,color:active===k?v.color:C.gray3,fontSize:12,fontWeight:600,cursor:"pointer",transition:"all 0.12s"}}>{k}</button>))}
      </div>
      <div style={{padding:"10px 16px",borderRadius:8,background:cur.color+"10",border:`1px solid ${cur.color}30`,marginBottom:14}}>
        <div style={{fontSize:11,fontWeight:700,color:cur.color,textTransform:"uppercase",letterSpacing:"0.08em"}}>{active}</div>
        <div style={{fontSize:13,color:C.dark,marginTop:2}}>{cur.sub}</div>
      </div>
      <div style={{position:"relative",marginBottom:14}}>
        <span style={{position:"absolute",left:12,top:"50%",transform:"translateY(-50%)",color:C.gray4,fontSize:14}}>🔍</span>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Cari nomor pasal atau topik..." style={{...St.inp,paddingLeft:36}}/>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        {items.map(p=>(
          <div key={p.ps} style={{background:C.white,border:`1px solid ${C.blue4}`,borderRadius:10,padding:"14px 16px",borderLeft:`3px solid ${cur.color}`}}>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
              <span style={{fontFamily:"monospace",fontSize:11,fontWeight:700,padding:"2px 8px",borderRadius:6,background:cur.color+"15",color:cur.color}}>Ps. {p.ps}</span>
              <span style={{fontSize:13,fontWeight:600,color:C.dark}}>{p.t}</span>
            </div>
            <div style={{fontFamily:"monospace",fontSize:12,color:C.blue1,background:C.blue5,padding:"8px 12px",borderRadius:6,marginBottom:6}}>{p.f}</div>
            <div style={{fontSize:11,color:C.gray3}}>📌 {p.n}</div>
          </div>
        ))}
        {items.length===0&&<div style={{textAlign:"center",color:C.gray4,padding:40,fontSize:13}}>Tidak ada pasal yang cocok dengan "{search}"</div>}
      </div>
    </div>
  );
}

export default function App() {
  const [tab,setTab]=useState("login"), [unlocked,setUnlocked]=useState(["login","sni"]);
  const [loggedIn,setLoggedIn]=useState(false), [role,setRole]=useState("");
  const unlock=id=>{setUnlocked(p=>p.includes(id)?p:[...p,id]);setTab(id);};
  const handleLogin=r=>{setLoggedIn(true);setRole(r);unlock("project");};

  return (
    <div style={St.app}>
      <div style={St.hdr}>
        <img src={LOGO} alt="SJK" style={{height:40,objectFit:"contain"}} onError={e=>{e.target.style.display="none";}}/>
        <div style={{borderLeft:`1px solid ${C.blue4}`,height:32,margin:"0 4px"}}/>
        <div>
          <div style={{fontSize:14,fontWeight:700,color:C.dark,lineHeight:1.2}}>SJK-ETABSRebarPro</div>
          <div style={{fontSize:10,color:C.gray3}}>PT Struclab Jaya Konsultindo</div>
        </div>
        {loggedIn&&(
          <div style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:12}}>
            <span style={{fontSize:12,color:C.gray3}}>👤 Budi Santoso</span>
            <span style={{...St.badge("b"),padding:"3px 10px",fontSize:12}}>{role}</span>
            <span style={{fontSize:11,color:C.gray3}}>📍 Kantor SJK</span>
          </div>
        )}
      </div>
      <div style={St.main}>
        <div style={St.side}>
          <div style={{padding:"0 18px 8px",fontSize:10,fontWeight:700,letterSpacing:"0.1em",color:C.gray4,textTransform:"uppercase"}}>ALUR KERJA</div>
          {TABS.map(t=>{const locked=!unlocked.includes(t.id),active=tab===t.id;return(
            <button key={t.id} style={St.tabBtn(active,locked)} onClick={()=>!locked&&setTab(t.id)}>
              <span style={{fontSize:14}}>{t.icon}</span><span>{t.label}</span>
              {locked&&<span style={{marginLeft:"auto",fontSize:10,color:C.gray4}}>🔒</span>}
            </button>
          );})}
          <div style={{borderTop:`1px solid ${C.gray2}`,margin:"12px 0 8px",padding:"8px 18px 0",fontSize:10,fontWeight:700,letterSpacing:"0.1em",color:C.gray4,textTransform:"uppercase"}}>REFERENSI</div>
          <button style={St.tabBtn(tab==="sni",false)} onClick={()=>setTab("sni")}><span style={{fontSize:14}}>📖</span><span>Panduan SNI</span></button>
          {loggedIn&&<>
            <div style={{borderTop:`1px solid ${C.gray2}`,margin:"12px 0 8px",padding:"8px 18px 0",fontSize:10,fontWeight:700,letterSpacing:"0.1em",color:C.gray4,textTransform:"uppercase"}}>PROJECT</div>
            <button style={St.tabBtn(false,false)}><span style={{fontSize:14}}>📂</span><span>Buka Project Lama</span></button>
            {(role==="Owner"||role==="Admin")&&<button style={St.tabBtn(false,false)}><span style={{fontSize:14}}>👥</span><span>Manajemen User</span></button>}
          </>}
        </div>
        <div style={St.body}>
          {tab==="login"    &&<TabLogin    onLogin={handleLogin}/>}
          {tab==="project"  &&<TabProject  onDone={()=>unlock("config")}/>}
          {tab==="config"   &&<TabConfig   onDone={()=>unlock("flexural")}/>}
          {tab==="flexural" &&<TabFlexural onDone={()=>unlock("shear")}/>}
          {tab==="shear"    &&<TabShear    onDone={()=>unlock("output")}/>}
          {tab==="output"   &&<TabOutput/>}
          {tab==="sni"      &&<TabSNI/>}
        </div>
      </div>
    </div>
  );
}
