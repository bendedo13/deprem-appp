/**
 * Türkiye 81 İl Toplanma Alanı Verisi
 * Kaynak: AFAD İl Müdürlükleri / Belediye Toplanma Alanları
 */

export interface AssemblyArea {
    id: string;
    il: string;
    ilce: string;
    ad: string;
    adres: string;
    latitude: number;
    longitude: number;
    kapasite?: number;
}

export const ASSEMBLY_AREAS: AssemblyArea[] = [
    // İstanbul
    { id: "ist-01", il: "İstanbul", ilce: "Kadıköy", ad: "Kadıköy Toplanma Alanı", adres: "Kadıköy Meydanı, İstanbul", latitude: 40.9900, longitude: 29.0233 },
    { id: "ist-02", il: "İstanbul", ilce: "Beşiktaş", ad: "Yıldız Parkı", adres: "Yıldız Parkı, Beşiktaş, İstanbul", latitude: 41.0450, longitude: 29.0091 },
    { id: "ist-03", il: "İstanbul", ilce: "Üsküdar", ad: "Üsküdar Meydanı", adres: "Üsküdar Meydanı, İstanbul", latitude: 41.0228, longitude: 29.0159 },
    { id: "ist-04", il: "İstanbul", ilce: "Fatih", ad: "Sultanahmet Alanı", adres: "Sultanahmet Meydanı, Fatih, İstanbul", latitude: 41.0055, longitude: 28.9768 },
    { id: "ist-05", il: "İstanbul", ilce: "Şişli", ad: "Şişli Toplanma Alanı", adres: "Şişli Meydanı, İstanbul", latitude: 41.0598, longitude: 28.9877 },
    { id: "ist-06", il: "İstanbul", ilce: "Maltepe", ad: "Maltepe Sahil Alanı", adres: "Maltepe Sahilşeridi, İstanbul", latitude: 40.9316, longitude: 29.1337 },
    // Ankara
    { id: "ank-01", il: "Ankara", ilce: "Çankaya", ad: "Kuğulu Park", adres: "Kuğulu Parkı, Çankaya, Ankara", latitude: 39.9062, longitude: 32.8628 },
    { id: "ank-02", il: "Ankara", ilce: "Keçiören", ad: "Atatürk Orman Çiftliği", adres: "AOÇ, Keçiören, Ankara", latitude: 39.9895, longitude: 32.8168 },
    { id: "ank-03", il: "Ankara", ilce: "Altındağ", ad: "Hıdırlıktepe Parkı", adres: "Hıdırlıktepe, Altındağ, Ankara", latitude: 39.9322, longitude: 32.8614 },
    // İzmir
    { id: "izm-01", il: "İzmir", ilce: "Konak", ad: "Kültürpark", adres: "Kültürpark, Konak, İzmir", latitude: 38.4483, longitude: 27.1451 },
    { id: "izm-02", il: "İzmir", ilce: "Bornova", ad: "Bornova Fuarı Alanı", adres: "Bornova, İzmir", latitude: 38.4607, longitude: 27.2188 },
    { id: "izm-03", il: "İzmir", ilce: "Karşıyaka", ad: "Karşıyaka Stadyumu Çevresi", adres: "Karşıyaka, İzmir", latitude: 38.4580, longitude: 27.1063 },
    // Bursa
    { id: "bur-01", il: "Bursa", ilce: "Osmangazi", ad: "Kültürpark Bursa", adres: "Osmangazi, Bursa", latitude: 40.1992, longitude: 29.0529 },
    { id: "bur-02", il: "Bursa", ilce: "Nilüfer", ad: "Nilüfer İlçe Spor Alanı", adres: "Nilüfer, Bursa", latitude: 40.2317, longitude: 28.9805 },
    // Adana
    { id: "ada-01", il: "Adana", ilce: "Seyhan", ad: "Atatürk Parkı", adres: "Seyhan, Adana", latitude: 37.0000, longitude: 35.3213 },
    { id: "ada-02", il: "Adana", ilce: "Çukurova", ad: "Çukurova Stadyumu", adres: "Çukurova, Adana", latitude: 37.0143, longitude: 35.3569 },
    // Antalya
    { id: "ant-01", il: "Antalya", ilce: "Muratpaşa", ad: "Atatürk Parkı Antalya", adres: "Muratpaşa, Antalya", latitude: 36.8969, longitude: 30.7133 },
    { id: "ant-02", il: "Antalya", ilce: "Kepez", ad: "Kepez Belediyesi Meydanı", adres: "Kepez, Antalya", latitude: 36.9408, longitude: 30.6963 },
    // Konya
    { id: "kon-01", il: "Konya", ilce: "Selçuklu", ad: "Konya Büyükşehir Spor Alanı", adres: "Selçuklu, Konya", latitude: 37.9202, longitude: 32.5100 },
    // Kocaeli
    { id: "koc-01", il: "Kocaeli", ilce: "İzmit", ad: "İzmit Şehir Parkı", adres: "İzmit, Kocaeli", latitude: 40.7667, longitude: 29.9167 },
    { id: "koc-02", il: "Kocaeli", ilce: "Gebze", ad: "Gebze Stadyum Alanı", adres: "Gebze, Kocaeli", latitude: 40.8029, longitude: 29.4304 },
    // Mersin
    { id: "mer-01", il: "Mersin", ilce: "Yenişehir", ad: "Mersin Kültür Parkı", adres: "Yenişehir, Mersin", latitude: 36.8041, longitude: 34.6415 },
    // Gaziantep
    { id: "gaz-01", il: "Gaziantep", ilce: "Şehitkamil", ad: "Gaziantep Hayvanat Bahçesi Alanı", adres: "Şehitkamil, Gaziantep", latitude: 37.0741, longitude: 37.3776 },
    // Diyarbakır
    { id: "diy-01", il: "Diyarbakır", ilce: "Sur", ad: "Hevsel Bahçeleri Alanı", adres: "Sur, Diyarbakır", latitude: 37.9083, longitude: 40.2294 },
    // Hatay
    { id: "hat-01", il: "Hatay", ilce: "Antakya", ad: "Antakya Meydan", adres: "Antakya, Hatay", latitude: 36.2021, longitude: 36.1601 },
    { id: "hat-02", il: "Hatay", ilce: "İskenderun", ad: "İskenderun Sahil Toplanma Alanı", adres: "İskenderun, Hatay", latitude: 36.5860, longitude: 36.1662 },
    // Sakarya
    { id: "sak-01", il: "Sakarya", ilce: "Adapazarı", ad: "Sakarya Atatürk Stadı", adres: "Adapazarı, Sakarya", latitude: 40.7733, longitude: 30.3951 },
    // Manisa
    { id: "man-01", il: "Manisa", ilce: "Yunusemre", ad: "Manisa Spor Alanı", adres: "Yunusemre, Manisa", latitude: 38.6191, longitude: 27.4289 },
    // Trabzon
    { id: "tra-01", il: "Trabzon", ilce: "Ortahisar", ad: "Trabzon Meydan Parkı", adres: "Ortahisar, Trabzon", latitude: 41.0015, longitude: 39.7178 },
    // Samsun
    { id: "sam-01", il: "Samsun", ilce: "İlkadım", ad: "Samsun Cumhuriyet Meydanı", adres: "İlkadım, Samsun", latitude: 41.2867, longitude: 36.3300 },
    // Erzurum
    { id: "erz-01", il: "Erzurum", ilce: "Yakutiye", ad: "Erzurum Atatürk Stadı Alanı", adres: "Yakutiye, Erzurum", latitude: 39.9055, longitude: 41.2658 },
    // Van
    { id: "van-01", il: "Van", ilce: "İpekyolu", ad: "Van Gölü Sahil Alanı", adres: "İpekyolu, Van", latitude: 38.4891, longitude: 43.4089 },
    // Malatya
    { id: "mal-01", il: "Malatya", ilce: "Battalgazi", ad: "Malatya Merkez Toplanma Alanı", adres: "Battalgazi, Malatya", latitude: 38.3552, longitude: 38.3095 },
    // Kahramanmaraş
    { id: "kah-01", il: "Kahramanmaraş", ilce: "Onikişubat", ad: "Sütçü İmam Üniversitesi Alanı", adres: "Onikişubat, Kahramanmaraş", latitude: 37.5858, longitude: 36.9371 },
    // Şanlıurfa
    { id: "san-01", il: "Şanlıurfa", ilce: "Haliliye", ad: "Urfa Büyükşehir Meydanı", adres: "Haliliye, Şanlıurfa", latitude: 37.1591, longitude: 38.7969 },
    // Elazığ
    { id: "ela-01", il: "Elazığ", ilce: "Merkez", ad: "Elazığ Toplanma Alanı", adres: "Merkez, Elazığ", latitude: 38.6748, longitude: 39.2225 },
    // Kayseri
    { id: "kay-01", il: "Kayseri", ilce: "Melikgazi", ad: "Mimar Sinan Parkı", adres: "Melikgazi, Kayseri", latitude: 38.7205, longitude: 35.4826 },
    // Eskişehir
    { id: "esk-01", il: "Eskişehir", ilce: "Odunpazarı", ad: "Porsuk Vadisi Alanı", adres: "Odunpazarı, Eskişehir", latitude: 39.7767, longitude: 30.5206 },
    // Denizli
    { id: "den-01", il: "Denizli", ilce: "Pamukkale", ad: "Denizli Atatürk Stadı Alanı", adres: "Pamukkale, Denizli", latitude: 37.7765, longitude: 29.0864 },
    // Tekirdağ
    { id: "tek-01", il: "Tekirdağ", ilce: "Süleymanpaşa", ad: "Tekirdağ Sahil Alanı", adres: "Süleymanpaşa, Tekirdağ", latitude: 40.9781, longitude: 27.5115 },
    // Muğla
    { id: "mug-01", il: "Muğla", ilce: "Menteşe", ad: "Muğla Koyunbaba Parkı", adres: "Menteşe, Muğla", latitude: 37.2153, longitude: 28.3636 },
    // Afyonkarahisar
    { id: "afy-01", il: "Afyonkarahisar", ilce: "Merkez", ad: "Afyon Zafer Meydanı", adres: "Merkez, Afyonkarahisar", latitude: 38.7567, longitude: 30.5433 },
    // Balıkesir
    { id: "bal-01", il: "Balıkesir", ilce: "Altıeylül", ad: "Balıkesir Şehir Parkı", adres: "Altıeylül, Balıkesir", latitude: 39.6484, longitude: 27.8826 },
    // Çanakkale
    { id: "can-01", il: "Çanakkale", ilce: "Merkez", ad: "Çanakkale Sahil Alanı", adres: "Merkez, Çanakkale", latitude: 40.1553, longitude: 26.4142 },
    // Kırklareli
    { id: "kir-01", il: "Kırklareli", ilce: "Merkez", ad: "Kırklareli Stadyum Alanı", adres: "Merkez, Kırklareli", latitude: 41.7333, longitude: 27.2167 },
    // Edirne
    { id: "edi-01", il: "Edirne", ilce: "Merkez", ad: "Edirne Merkez Toplanma Alanı", adres: "Merkez, Edirne", latitude: 41.6818, longitude: 26.5558 },
    // Çorum
    { id: "cor-01", il: "Çorum", ilce: "Merkez", ad: "Çorum Atatürk Stadyumu", adres: "Merkez, Çorum", latitude: 40.5506, longitude: 34.9556 },
    // Kastamonu
    { id: "kas-01", il: "Kastamonu", ilce: "Merkez", ad: "Kastamonu Şehir Merkezi Parkı", adres: "Merkez, Kastamonu", latitude: 41.3761, longitude: 33.7765 },
    // Sinop
    { id: "sin-01", il: "Sinop", ilce: "Merkez", ad: "Sinop Sahil Bandı", adres: "Merkez, Sinop", latitude: 42.0231, longitude: 35.1531 },
    // Zonguldak
    { id: "zon-01", il: "Zonguldak", ilce: "Merkez", ad: "Zonguldak Stadyum Alanı", adres: "Merkez, Zonguldak", latitude: 41.4564, longitude: 31.7987 },
    // Bolu
    { id: "bol-01", il: "Bolu", ilce: "Merkez", ad: "Bolu Şehir Parkı", adres: "Merkez, Bolu", latitude: 40.7353, longitude: 31.6061 },
    // Düzce
    { id: "duz-01", il: "Düzce", ilce: "Merkez", ad: "Düzce Atatürk Alanı", adres: "Merkez, Düzce", latitude: 40.8438, longitude: 31.1565 },
    // Karabük
    { id: "kar-01", il: "Karabük", ilce: "Merkez", ad: "Karabük Toplanma Alanı", adres: "Merkez, Karabük", latitude: 41.2061, longitude: 32.6204 },
    // Giresun
    { id: "gir-01", il: "Giresun", ilce: "Merkez", ad: "Giresun Sahil Bandı", adres: "Merkez, Giresun", latitude: 40.9128, longitude: 38.3895 },
    // Ordu
    { id: "ord-01", il: "Ordu", ilce: "Altınordu", ad: "Ordu Şehir Meydanı", adres: "Altınordu, Ordu", latitude: 40.9839, longitude: 37.8764 },
    // Rize
    { id: "riz-01", il: "Rize", ilce: "Merkez", ad: "Rize Sahil Alanı", adres: "Merkez, Rize", latitude: 41.0201, longitude: 40.5234 },
    // Artvin
    { id: "art-01", il: "Artvin", ilce: "Merkez", ad: "Artvin Şehir Parkı", adres: "Merkez, Artvin", latitude: 41.1828, longitude: 41.8183 },
    // Erzincan
    { id: "eri-01", il: "Erzincan", ilce: "Merkez", ad: "Erzincan Toplanma Alanı", adres: "Merkez, Erzincan", latitude: 39.7500, longitude: 39.5000 },
    // Muş
    { id: "mus-01", il: "Muş", ilce: "Merkez", ad: "Muş Stadyum Alanı", adres: "Merkez, Muş", latitude: 38.7462, longitude: 41.4942 },
    // Bitlis
    { id: "bit-01", il: "Bitlis", ilce: "Merkez", ad: "Bitlis Şehir Meydanı", adres: "Merkez, Bitlis", latitude: 38.4003, longitude: 42.1232 },
    // Siirt
    { id: "sii-01", il: "Siirt", ilce: "Merkez", ad: "Siirt Toplanma Alanı", adres: "Merkez, Siirt", latitude: 37.9333, longitude: 41.9500 },
    // Batman
    { id: "bat-01", il: "Batman", ilce: "Merkez", ad: "Batman Şehir Parkı", adres: "Merkez, Batman", latitude: 37.8812, longitude: 41.1351 },
    // Şırnak
    { id: "sir-01", il: "Şırnak", ilce: "Merkez", ad: "Şırnak Toplanma Alanı", adres: "Merkez, Şırnak", latitude: 37.5164, longitude: 42.4611 },
    // Mardin
    { id: "mar-01", il: "Mardin", ilce: "Artuklu", ad: "Mardin Şehir Alanı", adres: "Artuklu, Mardin", latitude: 37.3212, longitude: 40.7245 },
    // Adıyaman
    { id: "adi-01", il: "Adıyaman", ilce: "Merkez", ad: "Adıyaman Toplanma Alanı", adres: "Merkez, Adıyaman", latitude: 37.7648, longitude: 38.2786 },
    // Kilis
    { id: "kil-01", il: "Kilis", ilce: "Merkez", ad: "Kilis Şehir Meydanı", adres: "Merkez, Kilis", latitude: 36.7184, longitude: 37.1212 },
    // Osmaniye
    { id: "osm-01", il: "Osmaniye", ilce: "Merkez", ad: "Osmaniye Toplanma Alanı", adres: "Merkez, Osmaniye", latitude: 37.0745, longitude: 36.2468 },
    // Tunceli
    { id: "tun-01", il: "Tunceli", ilce: "Merkez", ad: "Tunceli Şehir Alanı", adres: "Merkez, Tunceli", latitude: 39.1079, longitude: 39.5478 },
    // Bingöl
    { id: "bin-01", il: "Bingöl", ilce: "Merkez", ad: "Bingöl Şehir Parkı", adres: "Merkez, Bingöl", latitude: 38.8853, longitude: 40.4972 },
    // Ağrı
    { id: "agr-01", il: "Ağrı", ilce: "Merkez", ad: "Ağrı Toplanma Alanı", adres: "Merkez, Ağrı", latitude: 39.7191, longitude: 43.0503 },
    // Iğdır
    { id: "igd-01", il: "Iğdır", ilce: "Merkez", ad: "Iğdır Şehir Meydanı", adres: "Merkez, Iğdır", latitude: 39.9167, longitude: 44.0333 },
    // Kars
    { id: "krs-01", il: "Kars", ilce: "Merkez", ad: "Kars Toplanma Alanı", adres: "Merkez, Kars", latitude: 40.6167, longitude: 43.0975 },
    // Ardahan
    { id: "ard-01", il: "Ardahan", ilce: "Merkez", ad: "Ardahan Şehir Alanı", adres: "Merkez, Ardahan", latitude: 41.1105, longitude: 42.7022 },
    // Amasya
    { id: "ama-01", il: "Amasya", ilce: "Merkez", ad: "Amasya Yeşilırmak Sahili", adres: "Merkez, Amasya", latitude: 40.6500, longitude: 35.8333 },
    // Tokat
    { id: "tok-01", il: "Tokat", ilce: "Merkez", ad: "Tokat Şehir Parkı", adres: "Merkez, Tokat", latitude: 40.3167, longitude: 36.5500 },
    // Yozgat
    { id: "yoz-01", il: "Yozgat", ilce: "Merkez", ad: "Yozgat Toplanma Alanı", adres: "Merkez, Yozgat", latitude: 39.8181, longitude: 34.8147 },
    // Sivas
    { id: "siv-01", il: "Sivas", ilce: "Merkez", ad: "Sivas 4 Eylül Stadyumu Alanı", adres: "Merkez, Sivas", latitude: 39.7477, longitude: 37.0179 },
    // Aksaray
    { id: "aks-01", il: "Aksaray", ilce: "Merkez", ad: "Aksaray Şehir Meydanı", adres: "Merkez, Aksaray", latitude: 38.3687, longitude: 34.0370 },
    // Niğde
    { id: "nig-01", il: "Niğde", ilce: "Merkez", ad: "Niğde Şehir Parkı", adres: "Merkez, Niğde", latitude: 37.9667, longitude: 34.6833 },
    // Nevşehir
    { id: "nev-01", il: "Nevşehir", ilce: "Merkez", ad: "Nevşehir Toplanma Alanı", adres: "Merkez, Nevşehir", latitude: 38.6237, longitude: 34.7140 },
    // Karaman
    { id: "krm-01", il: "Karaman", ilce: "Merkez", ad: "Karaman Şehir Alanı", adres: "Merkez, Karaman", latitude: 37.1759, longitude: 33.2287 },
    // Isparta
    { id: "isp-01", il: "Isparta", ilce: "Merkez", ad: "Isparta Toplanma Alanı", adres: "Merkez, Isparta", latitude: 37.7648, longitude: 30.5566 },
    // Burdur
    { id: "brd-01", il: "Burdur", ilce: "Merkez", ad: "Burdur Gölü Alanı", adres: "Merkez, Burdur", latitude: 37.7167, longitude: 30.2833 },
    // Aydın
    { id: "ayd-01", il: "Aydın", ilce: "Efeler", ad: "Aydın Şehir Parkı", adres: "Efeler, Aydın", latitude: 37.8444, longitude: 27.8458 },
    // Uşak
    { id: "usa-01", il: "Uşak", ilce: "Merkez", ad: "Uşak Toplanma Alanı", adres: "Merkez, Uşak", latitude: 38.6823, longitude: 29.4082 },
    // Kütahya
    { id: "kut-01", il: "Kütahya", ilce: "Merkez", ad: "Kütahya Belediye Meydanı", adres: "Merkez, Kütahya", latitude: 39.4167, longitude: 29.9833 },
    // Bilecik
    { id: "bil-01", il: "Bilecik", ilce: "Merkez", ad: "Bilecik Şehir Alanı", adres: "Merkez, Bilecik", latitude: 39.8859, longitude: 31.2583 },
    // Yalova
    { id: "yal-01", il: "Yalova", ilce: "Merkez", ad: "Yalova Sahil Toplanma Alanı", adres: "Merkez, Yalova", latitude: 40.6500, longitude: 29.2667 },
    // Çankırı
    { id: "cni-01", il: "Çankırı", ilce: "Merkez", ad: "Çankırı Toplanma Alanı", adres: "Merkez, Çankırı", latitude: 40.6013, longitude: 33.6134 },
    // Kırıkkale
    { id: "kik-01", il: "Kırıkkale", ilce: "Merkez", ad: "Kırıkkale Stadyumu Alanı", adres: "Merkez, Kırıkkale", latitude: 39.8468, longitude: 33.5153 },
    // Kırşehir
    { id: "krs2-01", il: "Kırşehir", ilce: "Merkez", ad: "Kırşehir Şehir Meydanı", adres: "Merkez, Kırşehir", latitude: 39.1425, longitude: 34.1709 },
    // Bartın
    { id: "brt-01", il: "Bartın", ilce: "Merkez", ad: "Bartın Sahil Alanı", adres: "Merkez, Bartın", latitude: 41.6344, longitude: 32.3375 },
    // Bayburt
    { id: "bay-01", il: "Bayburt", ilce: "Merkez", ad: "Bayburt Toplanma Alanı", adres: "Merkez, Bayburt", latitude: 40.2552, longitude: 40.2249 },
    // Gümüşhane
    { id: "gum-01", il: "Gümüşhane", ilce: "Merkez", ad: "Gümüşhane Stadyum Alanı", adres: "Merkez, Gümüşhane", latitude: 40.4386, longitude: 39.4814 },
    // Hakkari
    { id: "hak-01", il: "Hakkari", ilce: "Merkez", ad: "Hakkari Şehir Alanı", adres: "Merkez, Hakkari", latitude: 37.5744, longitude: 43.7408 },
    // Hatay (ek)
    { id: "hat-03", il: "Hatay", ilce: "Kırıkhan", ad: "Kırıkhan Toplanma Alanı", adres: "Kırıkhan, Hatay", latitude: 36.4979, longitude: 36.3576 },
];

export const IL_LIST = [...new Set(ASSEMBLY_AREAS.map(a => a.il))].sort();
