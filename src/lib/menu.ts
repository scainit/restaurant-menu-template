export type ProductSize = { id: string; name: string; nameAr: string; price: number };
export type Product = { id: string; categoryId: string; name: string; nameAr: string; description?: string; descriptionAr?: string; image?: string; price?: number; sizes?: ProductSize[]; available: boolean };
export const categories = [
 { id: "popular", name: "Popular", nameAr: "الأكثر طلباً" },
 { id: "mains", name: "Main dishes", nameAr: "الأطباق الرئيسية" },
 { id: "drinks", name: "Drinks", nameAr: "المشروبات" }
];
export const products: Product[] = [
 { id:"p1",categoryId:"popular",name:"Classic Burger",nameAr:"برجر كلاسيك",description:"Beef patty, cheese, lettuce and house sauce.",descriptionAr:"قطعة لحم، جبنة، خس وصوص المطعم.",image:"",sizes:[{id:"regular",name:"Regular",nameAr:"عادي",price:145},{id:"double",name:"Double",nameAr:"دبل",price:195}],available:true },
 { id:"p2",categoryId:"mains",name:"Grilled Chicken",nameAr:"فراخ مشوية",description:"Grilled chicken with a side of your choice.",descriptionAr:"فراخ مشوية مع اختيارك من الإضافات.",price:175,available:true },
 { id:"p3",categoryId:"drinks",name:"Fresh Lemonade",nameAr:"ليمونادة فريش",description:"Freshly squeezed lemon.",descriptionAr:"ليمون طازة.",price:45,available:true }
];