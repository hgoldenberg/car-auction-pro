import corolla from '@/assets/demo-toyota-corolla.jpg';
import corollaSide from '@/assets/vehicles/corolla-side.jpg';
import corollaInterior from '@/assets/vehicles/corolla-interior.jpg';
import ranger from '@/assets/demo-ford-ranger.jpg';
import rangerSide from '@/assets/vehicles/ranger-side.jpg';
import rangerInterior from '@/assets/vehicles/ranger-interior.jpg';
import taos from '@/assets/demo-vw-taos.jpg';
import taosSide from '@/assets/vehicles/taos-side.jpg';
import taosInterior from '@/assets/vehicles/taos-interior.jpg';
import cruze from '@/assets/demo-chevrolet-cruze.jpg';
import cruzeSide from '@/assets/vehicles/cruze-side.jpg';
import cruzeInterior from '@/assets/vehicles/cruze-interior.jpg';
import peugeot from '@/assets/demo-peugeot-208.jpg';
import peugeotSide from '@/assets/vehicles/peugeot208-side.jpg';
import peugeotInterior from '@/assets/vehicles/peugeot208-interior.jpg';
import versa from '@/assets/demo-nissan-versa.jpg';
import versaSide from '@/assets/vehicles/versa-side.jpg';
import versaInterior from '@/assets/vehicles/versa-interior.jpg';
import type { Database } from '@/integrations/supabase/types';

type Tables = Database['public']['Tables'];
type Vehicle = Tables['vehicles']['Row'];
type Auction = Tables['auctions']['Row'];
type Lead = Tables['leads']['Row'];
type Bid = Tables['bids']['Row'];
type Group = Tables['telegram_groups']['Row'];
type Publication = Tables['auction_group_publications']['Row'];
type Activity = Tables['activity_log']['Row'];
type Note = Tables['lead_notes']['Row'];
type VehicleImage = Tables['vehicle_images']['Row'];

const stamp = '2026-09-14T20:00:00.000Z';
const uuid = (kind: number, n: number) => `${kind.toString().padStart(8, '0')}-0000-4000-8000-${n.toString().padStart(12, '0')}`;

const vehicleSpecs = [
  ['Toyota','Corolla','XEI CVT',2024,'Gris plata',18500,28500000,'published',corolla,[corollaSide,corollaInterior]],
  ['Ford','Ranger','Limited 4x4 AT',2023,'Azul profundo',42100,41800000,'published',ranger,[rangerSide,rangerInterior]],
  ['Volkswagen','Taos','Highline 250 TSI',2024,'Blanco',12100,37200000,'published',taos,[taosSide,taosInterior]],
  ['Chevrolet','Cruze','Premier AT',2023,'Negro',28800,26700000,'published',cruze,[cruzeSide,cruzeInterior]],
  ['Peugeot','208','Feline Tiptronic',2025,'Rojo',8400,24400000,'published',peugeot,[peugeotSide,peugeotInterior]],
  ['Nissan','Versa','Exclusive CVT',2024,'Gris oscuro',15600,25900000,'published',versa,[versaSide,versaInterior]],
  ['Toyota','Corolla Cross','SEG Hybrid',2023,'Blanco perlado',33900,39500000,'ready',corolla,[corollaInterior,corollaSide]],
  ['Ford','Ranger','XLT 4x2 AT',2022,'Plata',58600,33500000,'published',ranger,[rangerInterior,rangerSide]],
  ['Volkswagen','Taos','Comfortline 250 TSI',2023,'Azul',27400,31800000,'ready',taos,[taosInterior,taosSide]],
  ['Chevrolet','Cruze','LT Turbo AT',2022,'Blanco',49700,22100000,'sold',cruze,[cruzeSide,cruzeInterior]],
  ['Peugeot','208','Allure Pack',2024,'Gris',19100,21800000,'draft',peugeot,[peugeotInterior,peugeotSide]],
  ['Nissan','Versa','Advance MT',2023,'Plata',36400,20500000,'archived',versa,[versaSide,versaInterior]],
] as const;

export const demoVehicles: (Vehicle & { vehicle_images: VehicleImage[]; _thumb: string })[] = vehicleSpecs.map((v, i) => {
  const id = uuid(1, i + 1);
  const images = [v[8], ...v[9]].map((path, j) => ({ id: uuid(7, i * 3 + j + 1), vehicle_id: id, storage_path: path, is_main: j === 0, display_order: j, created_at: stamp }));
  return {
    id, make:v[0], model:v[1], trim:v[2], year:v[3], color:v[4], km:v[5], reserve_price:v[6], status:v[7],
    description:'Unidad ficticia preparada para demostrar el flujo comercial de Criteriva.', doors:5,
    fuel_type: i === 6 ? 'Híbrido' : i % 3 === 1 ? 'Diésel' : 'Nafta', transmission:i % 4 === 0 ? 'Manual' : 'Automática',
    vin:`DEMO${String(i + 1).padStart(8,'0')}`, created_at:`2026-08-${String(i + 1).padStart(2,'0')}T14:00:00.000Z`, updated_at:stamp,
    vehicle_images:images, _thumb:images[0].storage_path,
  } as Vehicle & { vehicle_images: VehicleImage[]; _thumb: string };
});
export const demoVehicleImages = demoVehicles.flatMap(v => v.vehicle_images);

const auctionSpecs = [
  [0,'Toyota Corolla 2024 · Subasta Septiembre','active',25000000,28500000,29100000,'2026-09-12T13:00:00Z','2026-10-02T21:00:00Z'],
  [1,'Ford Ranger Limited · Oportunidad 4x4','active',36000000,41800000,42500000,'2026-09-13T13:00:00Z','2026-10-04T20:00:00Z'],
  [2,'Volkswagen Taos Highline 2024','scheduled',33000000,37200000,0,'2026-09-22T13:00:00Z','2026-10-08T21:00:00Z'],
  [3,'Chevrolet Cruze Premier 2023','closed',23000000,26700000,27200000,'2026-08-28T13:00:00Z','2026-09-10T21:00:00Z'],
  [4,'Peugeot 208 Feline 2025','active',21000000,24400000,23800000,'2026-09-14T13:00:00Z','2026-10-06T21:30:00Z'],
  [5,'Nissan Versa Exclusive 2024','cancelled',22000000,25900000,0,'2026-09-08T13:00:00Z','2026-09-18T21:00:00Z'],
  [6,'Toyota Corolla Cross Hybrid','scheduled',35000000,39500000,0,'2026-09-25T13:00:00Z','2026-10-10T21:00:00Z'],
  [7,'Ford Ranger XLT 2022','awarded',29500000,33500000,34400000,'2026-08-20T13:00:00Z','2026-09-05T21:00:00Z'],
  [8,'Volkswagen Taos Comfortline','paused',28000000,31800000,30500000,'2026-09-10T13:00:00Z','2026-10-01T21:00:00Z'],
] as const;

export const demoAuctions: (Auction & { vehicles: Vehicle })[] = auctionSpecs.map((a, i) => ({
  id:uuid(2,i+1), vehicle_id:demoVehicles[a[0]].id, title:a[1], status:a[2], starting_price:a[3], reserve_price:a[4], current_high_bid:a[5], bid_count:0,
  start_date:a[6], end_date:a[7], created_at:`2026-08-${String(15+i).padStart(2,'0')}T12:00:00Z`, updated_at:stamp,
  vehicles:demoVehicles[a[0]],
}));

export const demoGroups: Group[] = [
  {id:uuid(3,1),name:'Subastas Demo Premium',description:'Vehículos seleccionados · entorno ficticio',chat_id:null,is_active:true,is_real_group:false,member_count:1842,notes:'Grupo ficticio',created_at:'2026-08-01T12:00:00Z'},
  {id:uuid(3,2),name:'Oportunidades 4x4 Demo',description:'Pick-ups y utilitarios de demostración',chat_id:null,is_active:true,is_real_group:false,member_count:967,notes:'Grupo ficticio',created_at:'2026-08-02T12:00:00Z'},
  {id:uuid(3,3),name:'Autos Urbanos Demo',description:'Sedanes y hatchbacks de demostración',chat_id:null,is_active:true,is_real_group:false,member_count:2314,notes:'Grupo ficticio',created_at:'2026-08-03T12:00:00Z'},
];

const leadStatuses = ['new','interested','bid_once','active_bidder','finalist','winner','follow_up','lost','closed'] as const;
export const demoLeads: (Lead & { telegram_groups: {name:string} })[] = Array.from({length:14},(_,i) => ({
  id:uuid(4,i+1), full_name:`Lead Demo ${String(i+1).padStart(2,'0')}`, city:['Córdoba','Rosario','Mendoza','La Plata'][i%4], email:null, phone:null, telegram_username:null,
  status:leadStatuses[i%leadStatuses.length], origin_group_id:demoGroups[i%3].id, latest_bid_amount:null,
  created_at:`2026-09-${String((i%10)+1).padStart(2,'0')}T${String(10+i%8).padStart(2,'0')}:00:00Z`, last_activity_at:stamp, updated_at:stamp,
  telegram_groups:{name:demoGroups[i%3].name},
}));

const bidSeed = [
  [0,2,25100000,'outbid'],[0,3,26300000,'outbid'],[0,4,27900000,'outbid'],[0,5,29100000,'leading'],
  [1,6,37200000,'outbid'],[1,7,39800000,'outbid'],[1,8,42500000,'leading'],
  [3,1,24100000,'outbid'],[3,9,25800000,'outbid'],[3,10,27200000,'winning'],
  [4,11,21400000,'outbid'],[4,12,22600000,'outbid'],[4,13,23800000,'leading'],
  [7,0,30100000,'outbid'],[7,4,32700000,'outbid'],[7,8,34400000,'winning'],
  [8,2,28600000,'outbid'],[8,6,30500000,'leading'],
] as const;
export const demoBids: (Bid & { leads:{full_name:string;telegram_username:null}; auctions?: any })[] = bidSeed.map((b,i) => ({
  id:uuid(5,i+1),auction_id:demoAuctions[b[0]].id,lead_id:demoLeads[b[1]].id,amount:b[2],status:b[3],notes:'Oferta ficticia',created_at:`2026-09-${String(2+(i%12)).padStart(2,'0')}T${String(9+(i%9)).padStart(2,'0')}:15:00Z`,
  leads:{full_name:demoLeads[b[1]].full_name,telegram_username:null},
  auctions:{...demoAuctions[b[0]],vehicles:demoAuctions[b[0]].vehicles},
}));
for (const auction of demoAuctions) {
  const related=demoBids.filter(b=>b.auction_id===auction.id);
  auction.bid_count=related.length;
  auction.current_high_bid=related.length ? Math.max(...related.map(b=>b.amount)) : 0;
}
for (const lead of demoLeads) {
  const related=demoBids.filter(b=>b.lead_id===lead.id);
  lead.latest_bid_amount=related.length ? related.sort((a,b)=>b.created_at.localeCompare(a.created_at))[0].amount : null;
}

export const demoPublications: (Publication & {telegram_groups:{name:string};auctions:any})[] = demoAuctions.filter(a=>['active','closed','awarded','paused'].includes(a.status)).map((a,i)=>({
  id:uuid(6,i+1),auction_id:a.id,group_id:demoGroups[i%3].id,status:'posted',publication_type:'initial',message_id:`demo-${i+1}`,external_message_id:null,error_message:null,published_at:`2026-09-${String(8+i).padStart(2,'0')}T15:00:00Z`,created_at:`2026-09-${String(8+i).padStart(2,'0')}T15:00:00Z`,
  telegram_groups:{name:demoGroups[i%3].name},auctions:a,
}));

export const demoActivity: Activity[] = [
  ...demoBids.slice().reverse().map((b,i)=>({id:uuid(8,i+1),action:b.status==='winning'?'leading_bid_updated':'bid_received',entity_type:'auction',entity_id:b.auction_id,description:`Oferta ${new Intl.NumberFormat('es-AR',{style:'currency',currency:'ARS',maximumFractionDigits:0}).format(b.amount)} de ${b.leads.full_name} en ${demoAuctions.find(a=>a.id===b.auction_id)?.title}.`,metadata:{bid_id:b.id},created_at:`2026-09-14T${String(19-Math.floor(i/3)).padStart(2,'0')}:${String((i*7)%60).padStart(2,'0')}:00Z`})),
  ...demoAuctions.slice(0,8).map((a,i)=>({id:uuid(8,50+i),action:a.status==='active'?'auction_activated':'auction_created',entity_type:'auction',entity_id:a.id,description:`${a.title}: ${a.status==='active'?'subasta activada':'subasta preparada'} con datos ficticios.`,metadata:null,created_at:`2026-09-${String(13-i).padStart(2,'0')}T12:00:00Z`})),
].sort((a,b)=>b.created_at.localeCompare(a.created_at));

export const demoNotes: Note[] = demoLeads.slice(0,8).map((l,i)=>({id:uuid(9,i+1),lead_id:l.id,content:['Solicitó ficha técnica del vehículo.','Interesado en coordinar inspección.','Prefiere seguimiento por el panel demo.'][i%3],created_by:null,created_at:`2026-09-${String(10+i%4).padStart(2,'0')}T11:00:00Z`}));
export const demoGalleryViews = demoAuctions.flatMap((a,ai)=>Array.from({length:[18,25,0,31,14,0,0,42,9][ai]||0},(_,i)=>({id:uuid(10,ai*50+i+1),auction_id:a.id,viewed_at:`2026-09-${String(8+(i%7)).padStart(2,'0')}T${String(10+i%10).padStart(2,'0')}:00:00Z`,referrer:null,user_agent:null})));

export const demoAuctionById=(id?:string)=>demoAuctions.find(a=>a.id===id);
export const demoLeadById=(id?:string)=>demoLeads.find(l=>l.id===id);
export const demoImagesForVehicle=(vehicleId?:string)=>demoVehicleImages.filter(i=>i.vehicle_id===vehicleId);
export const demoBidsForAuction=(auctionId?:string)=>demoBids.filter(b=>b.auction_id===auctionId).sort((a,b)=>b.amount-a.amount);
export const demoBidsForLead=(leadId?:string)=>demoBids.filter(b=>b.lead_id===leadId).sort((a,b)=>b.created_at.localeCompare(a.created_at));
export const demoPublicationsForAuction=(auctionId?:string)=>demoPublications.filter(p=>p.auction_id===auctionId);
export const demoActivityFor=(id?:string)=>demoActivity.filter(a=>a.entity_id===id);
export const demoViewsForAuction=(auctionId?:string)=>demoGalleryViews.filter(v=>v.auction_id===auctionId);
