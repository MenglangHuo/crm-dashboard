export interface CambodiaProvince {
	provinceCode: string;
	provinceEn: string;
	provinceKh: string;
}

export const CAMBODIA_PROVINCES: CambodiaProvince[] = [
	{ provinceCode: "12", provinceEn: "Phnom Penh", provinceKh: "រាជធានីភ្នំពេញ" },
	{ provinceCode: "08", provinceEn: "Kandal", provinceKh: "កណ្ដាល" },
	{
		provinceCode: "01",
		provinceEn: "Banteay Meanchey",
		provinceKh: "បន្ទាយមានជ័យ",
	},
	{ provinceCode: "02", provinceEn: "Battambang", provinceKh: "បាត់ដំបង" },
	{ provinceCode: "03", provinceEn: "Kampong Cham", provinceKh: "កំពង់ចាម" },
	{ provinceCode: "04", provinceEn: "Kampong Chhnang", provinceKh: "កំពង់ឆ្នាំង" },
	{ provinceCode: "05", provinceEn: "Kampong Speu", provinceKh: "កំពង់ស្ពឺ" },
	{ provinceCode: "06", provinceEn: "Kampong Thom", provinceKh: "កំពង់ធំ" },
	{ provinceCode: "07", provinceEn: "Kampot", provinceKh: "កំពត" },
	{ provinceCode: "09", provinceEn: "Koh Kong", provinceKh: "កោះកុង" },
	{ provinceCode: "10", provinceEn: "Kratie", provinceKh: "ក្រចេះ" },
	{ provinceCode: "11", provinceEn: "Mondulkiri", provinceKh: "មណ្ឌលគិរី" },
	{ provinceCode: "13", provinceEn: "Preah Vihear", provinceKh: "ព្រះវិហារ" },
	{ provinceCode: "14", provinceEn: "Prey Veng", provinceKh: "ព្រៃវែង" },
	{ provinceCode: "15", provinceEn: "Pursat", provinceKh: "ពោធិ៍សាត់" },
	{ provinceCode: "16", provinceEn: "Ratanakiri", provinceKh: "រតនគិរី" },
	{ provinceCode: "17", provinceEn: "Siem Reap", provinceKh: "សៀមរាប" },
	{ provinceCode: "18", provinceEn: "Preah Sihanouk", provinceKh: "ព្រះសីហនុ" },
	{ provinceCode: "19", provinceEn: "Stung Treng", provinceKh: "ស្ទឹងត្រែង" },
	{ provinceCode: "20", provinceEn: "Svay Rieng", provinceKh: "ស្វាយរៀង" },
	{ provinceCode: "21", provinceEn: "Takeo", provinceKh: "តាកែវ" },
	{ provinceCode: "22", provinceEn: "Oddar Meanchey", provinceKh: "ឧត្តរមានជ័យ" },
	{ provinceCode: "23", provinceEn: "Kep", provinceKh: "កែប" },
	{ provinceCode: "24", provinceEn: "Pailin", provinceKh: "ប៉ៃលិន" },
	{ provinceCode: "25", provinceEn: "Tboung Khmum", provinceKh: "ត្បូងឃ្មុំ" },
];

export function getProvinceByCode(code?: string): CambodiaProvince | null {
	if (!code) return null;
	return (
		CAMBODIA_PROVINCES.find((p) => p.provinceCode === String(code)) || null
	);
}

export function resolveDeliveryProvinces(
	primaryCode?: string,
	codes: string[] = [],
) {
	const primaryProvince = getProvinceByCode(primaryCode);
	const provincesMap = new Map<string, CambodiaProvince>();

	if (primaryProvince) {
		provincesMap.set(primaryProvince.provinceCode, primaryProvince);
	}

	for (const c of codes) {
		const prov = getProvinceByCode(c);
		if (prov) {
			provincesMap.set(prov.provinceCode, prov);
		}
	}

	return {
		primaryProvince,
		provinces: Array.from(provincesMap.values()),
	};
}

export const PROVINCE_COORDINATES: Record<string, { lat: number; lng: number }> = {
	"12": { lat: 11.5564, lng: 104.9282 }, // Phnom Penh
	"08": { lat: 11.4833, lng: 104.9500 }, // Kandal
	"01": { lat: 13.5859, lng: 102.9737 }, // Banteay Meanchey
	"02": { lat: 13.0957, lng: 103.2022 }, // Battambang
	"03": { lat: 11.9924, lng: 105.4635 }, // Kampong Cham
	"04": { lat: 12.2500, lng: 104.6667 }, // Kampong Chhnang
	"05": { lat: 11.4533, lng: 104.5209 }, // Kampong Speu
	"06": { lat: 12.7111, lng: 104.8887 }, // Kampong Thom
	"07": { lat: 10.6104, lng: 104.1815 }, // Kampot
	"09": { lat: 11.6153, lng: 102.9838 }, // Koh Kong
	"10": { lat: 12.4881, lng: 106.0188 }, // Kratie
	"11": { lat: 12.4558, lng: 107.1881 }, // Mondulkiri
	"13": { lat: 13.8073, lng: 104.9810 }, // Preah Vihear
	"14": { lat: 11.4868, lng: 105.3253 }, // Prey Veng
	"15": { lat: 12.5388, lng: 103.9192 }, // Pursat
	"16": { lat: 13.7394, lng: 106.9873 }, // Ratanakiri
	"17": { lat: 13.3671, lng: 103.8448 }, // Siem Reap
	"18": { lat: 10.6275, lng: 103.5221 }, // Preah Sihanouk
	"19": { lat: 13.5259, lng: 105.9683 }, // Stung Treng
	"20": { lat: 11.0879, lng: 105.7993 }, // Svay Rieng
	"21": { lat: 10.9908, lng: 104.7850 }, // Takeo
	"22": { lat: 14.1818, lng: 103.5176 }, // Oddar Meanchey
	"23": { lat: 10.4829, lng: 104.3167 }, // Kep
	"24": { lat: 12.8489, lng: 102.6093 }, // Pailin
	"25": { lat: 11.9056, lng: 105.6565 }, // Tboung Khmum
};

export function getProvinceCoordinates(code?: string): { lat: number; lng: number } {
	if (code && PROVINCE_COORDINATES[code]) {
		return PROVINCE_COORDINATES[code];
	}
	return { lat: 11.5564, lng: 104.9282 };
}
