export interface RegionGroup {
  label: string;
  areas: { name: string; lat: number; lng: number }[];
}

export const REGION_GROUPS: RegionGroup[] = [
  {
    label: '서울',
    areas: [
      { name: '강남구', lat: 37.5172, lng: 127.0473 },
      { name: '강동구', lat: 37.5301, lng: 127.1238 },
      { name: '강북구', lat: 37.6396, lng: 127.0255 },
      { name: '강서구', lat: 37.5510, lng: 126.8495 },
      { name: '관악구', lat: 37.4784, lng: 126.9516 },
      { name: '광진구', lat: 37.5385, lng: 127.0823 },
      { name: '구로구', lat: 37.4954, lng: 126.8875 },
      { name: '금천구', lat: 37.4569, lng: 126.8956 },
      { name: '노원구', lat: 37.6542, lng: 127.0568 },
      { name: '도봉구', lat: 37.6688, lng: 127.0472 },
      { name: '동대문구', lat: 37.5744, lng: 127.0396 },
      { name: '동작구', lat: 37.5124, lng: 126.9393 },
      { name: '마포구', lat: 37.5663, lng: 126.9018 },
      { name: '서대문구', lat: 37.5791, lng: 126.9368 },
      { name: '서초구', lat: 37.4837, lng: 127.0324 },
      { name: '성동구', lat: 37.5634, lng: 127.0370 },
      { name: '성북구', lat: 37.5894, lng: 127.0167 },
      { name: '송파구', lat: 37.5146, lng: 127.1060 },
      { name: '양천구', lat: 37.5170, lng: 126.8665 },
      { name: '영등포구', lat: 37.5264, lng: 126.8963 },
      { name: '용산구', lat: 37.5324, lng: 126.9906 },
      { name: '은평구', lat: 37.6027, lng: 126.9291 },
      { name: '종로구', lat: 37.5735, lng: 126.9790 },
      { name: '중구', lat: 37.5641, lng: 126.9979 },
      { name: '중랑구', lat: 37.6066, lng: 127.0927 },
    ],
  },
  {
    label: '경기 남부',
    areas: [
      { name: '성남시', lat: 37.4201, lng: 127.1267 },
      { name: '판교', lat: 37.3948, lng: 127.1112 },
      { name: '분당', lat: 37.3825, lng: 127.1197 },
      { name: '수원시', lat: 37.2636, lng: 127.0286 },
      { name: '용인시', lat: 37.2411, lng: 127.1775 },
      { name: '안양시', lat: 37.3943, lng: 126.9568 },
      { name: '안산시', lat: 37.3219, lng: 126.8309 },
      { name: '화성시', lat: 37.1996, lng: 126.8312 },
      { name: '평택시', lat: 36.9921, lng: 127.0855 },
      { name: '광명시', lat: 37.4786, lng: 126.8645 },
      { name: '군포시', lat: 37.3616, lng: 126.9352 },
      { name: '의왕시', lat: 37.3449, lng: 126.9685 },
      { name: '하남시', lat: 37.5393, lng: 127.2147 },
      { name: '광주시', lat: 37.4095, lng: 127.2571 },
      { name: '이천시', lat: 37.2720, lng: 127.4350 },
      { name: '오산시', lat: 37.1499, lng: 127.0697 },
      { name: '시흥시', lat: 37.3800, lng: 126.8030 },
    ],
  },
  {
    label: '경기 북부',
    areas: [
      { name: '고양시', lat: 37.6584, lng: 126.8320 },
      { name: '일산', lat: 37.6593, lng: 126.7730 },
      { name: '파주시', lat: 37.7599, lng: 126.7800 },
      { name: '의정부시', lat: 37.7381, lng: 127.0337 },
      { name: '남양주시', lat: 37.6358, lng: 127.2163 },
      { name: '구리시', lat: 37.5943, lng: 127.1296 },
      { name: '양주시', lat: 37.7853, lng: 127.0456 },
      { name: '포천시', lat: 37.8948, lng: 127.2003 },
      { name: '동두천시', lat: 37.9034, lng: 127.0606 },
      { name: '김포시', lat: 37.6154, lng: 126.7156 },
    ],
  },
];

// Flat list of all area names for search tab text-based area chips
export const AREA_NAMES_SEOUL = REGION_GROUPS[0].areas.map((a) => a.name);
export const AREA_NAMES_GYEONGGI_SOUTH = REGION_GROUPS[1].areas.map((a) => a.name);
export const AREA_NAMES_GYEONGGI_NORTH = REGION_GROUPS[2].areas.map((a) => a.name);
