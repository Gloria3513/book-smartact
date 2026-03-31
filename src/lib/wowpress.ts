/**
 * 와우프레스 OPEN API 클라이언트
 * https://api.wowpress.co.kr
 */

const API_BASE = 'https://api.wowpress.co.kr'
const FILE_BASE = 'https://file.wowpress.co.kr'

function getToken(): string {
  const token = process.env.WOWPRESS_JWT_TOKEN
  if (!token) throw new Error('WOWPRESS_JWT_TOKEN 환경변수가 설정되지 않았습니다')
  return token
}

function authHeaders() {
  return {
    'Authorization': `Bearer ${getToken()}`,
    'Content-Type': 'application/json',
  }
}

// ─── 토큰 발급 ───

export async function issueToken(authUid: string, authPw: string) {
  const res = await fetch(`${API_BASE}/api/login/issue`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ authUid, authPw }),
  })
  return res.json()
}

// ─── 회원정보 조회 ───

export async function getMyInfo() {
  const res = await fetch(`${API_BASE}/api/v1/mpag/myinfo/view`, {
    headers: authHeaders(),
  })
  return res.json()
}

// ─── 제품목록 조회 ───

export async function getProductList() {
  const res = await fetch(`${API_BASE}/api/v1/std/prodlist`, {
    headers: authHeaders(),
  })
  return res.json()
}

// ─── 제품상세 조회 ───

export async function getProductInfo(prodno: number) {
  const res = await fetch(`${API_BASE}/api/v1/std/prod_info/${prodno}`, {
    headers: authHeaders(),
  })
  return res.json()
}

// ─── 제품별 옵션 조회 ───

export async function getProductSize(prodNo: number) {
  const res = await fetch(`${API_BASE}/api/v1/std/size`, {
    method: 'GET',
    headers: authHeaders(),
    body: JSON.stringify({ prodNo }),
  })
  return res.json()
}

export async function getProductPaper(prodNo: number, sizeNo: number) {
  const res = await fetch(`${API_BASE}/api/v1/std/paper`, {
    method: 'GET',
    headers: authHeaders(),
    body: JSON.stringify({ prodNo, sizeNo }),
  })
  return res.json()
}

export async function getProductQty(prodNo: number, sizeNo: number, colorNo: number, paperNo: number) {
  const res = await fetch(`${API_BASE}/api/v1/std/qty`, {
    method: 'GET',
    headers: authHeaders(),
    body: JSON.stringify({ prodNo, sizeNo, colorNo, paperNo }),
  })
  return res.json()
}

// ─── 제품가격 조회 ───

export interface PriceParams {
  prodno: number
  ordqty: string
  ordcnt: string
  ordtitle: string
  prsjob: Array<{
    jobno: string
    covercd: number
    sizeno: string
    wsize?: string
    hsize?: string
    jobqty: string
    paperno: string
    colorno0: string
    colorno0add?: string
  }>
  awkjob?: Array<{
    jobno: string
    covercd: number
    jobqty: string
  }>
}

export async function getPrice(params: PriceParams) {
  const res = await fetch(`${API_BASE}/api/v1/ord/cjson_jobcost`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(params),
  })
  return res.json()
}

// ─── 주문하기 ───

export interface OrderDelivery {
  name: string
  tel: string
  hp?: string
  sd: string       // 시도
  sgg: string      // 시군구
  umd?: string     // 읍면동
  addr1: string    // 주소1
  addr2: string    // 상세주소
  zipcode?: string
}

export interface OrderParams {
  action: 'ord' | 'cal'  // ord: 주문, cal: 계산만
  ordreq: Array<Array<{
    prodno: number
    ordqty: string
    ordcnt: string
    ordtitle: string
    ordbody?: string
    ordkey: string
    jobpresetno?: string
    prsjob: Array<{
      jobno: string
      covercd: number
      sizeno: string
      wsize?: string
      hsize?: string
      jobqty: string
      paperno: string
      colorno0: string
      colorno0add?: string
    }>
    awkjob: Array<{
      jobno: string
      covercd: number
      jobqty: string
    }>
  }>>
  dcpointreq?: number
  dlvymcd: string        // 배송방법 코드
  dlvyfr: OrderDelivery  // 보내는 곳
  dlvyto: OrderDelivery  // 받는 곳
}

export async function createOrder(params: OrderParams) {
  const res = await fetch(`${API_BASE}/api/v1/ord/cjson_order`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(params),
  })
  return res.json()
}

// ─── 파일 업로드 (URL 비동기 방식) ───

export async function uploadFileByUrl(ordnum: string, filename: string, fileurl: string, returnUrl?: string) {
  const formData = new URLSearchParams()
  formData.append('ordnum', ordnum)
  formData.append('filename', filename)
  formData.append('fileurl', fileurl)
  if (returnUrl) formData.append('returnUrl', returnUrl)

  const res = await fetch(`${FILE_BASE}/api/v1/file/uploadasyc`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${getToken()}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: formData.toString(),
  })
  return res.json()
}

// ─── 주문취소 ───

export async function cancelOrder(ordnum: string) {
  const res = await fetch(`${API_BASE}/api/v1/ord/ord_cancel`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ ordnum }),
  })
  return res.json()
}

// ─── 주문상세 ───

export async function getOrderDetail(ordnum: string) {
  const res = await fetch(`${API_BASE}/api/v1/ord/order/${ordnum}`, {
    headers: authHeaders(),
  })
  return res.json()
}

// ─── 주문배송목록 조회 ───

export async function getOrderList(params: {
  stdt: string    // 시작일 YYYY-MM-DD
  eddt: string    // 종료일
  validord?: string
  pageIndex?: number
  recordCountPerPage?: number
}) {
  const res = await fetch(`${API_BASE}/api/v1/ord/ord_list`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(params),
  })
  return res.json()
}

// ─── 예상출고일 ───

export async function getDeliveryDate(ordnum: string) {
  const res = await fetch(`${API_BASE}/api/v1/ord/dlvydate/${ordnum}`, {
    headers: authHeaders(),
  })
  return res.json()
}

// ─── 콜백 URL 등록 ───

export async function registerCallbackUrl(cbkurl: string) {
  const res = await fetch(`${API_BASE}/api/v1/mpag/cbkurl/update`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${getToken()}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: `cbkurl=${encodeURIComponent(cbkurl)}`,
  })
  return res.json()
}

// ─── 무선책자 자서전 주문 헬퍼 ───

/**
 * 자서전 인쇄 주문을 위한 간편 함수
 * 무선책자(40196) 기본 패키지로 주문
 */
export async function orderMemoirPrint(params: {
  orderId: string
  quantity: number
  pageCount: number
  packageType: 'basic' | 'premium'
  deliveryTo: OrderDelivery
}) {
  const { orderId, quantity, pageCount, packageType, deliveryTo } = params

  // 패키지별 옵션 매핑 (실제 값은 제품상세 조회로 확인 필요)
  const packages = {
    basic: {
      coverPaper: '22001',   // 스노우지 250g (예시값, 실제 조회 필요)
      innerPaper: '22010',   // 백색모조지 100g
      coverColor: '1001',    // 4도 (컬러)
      innerColor: '1001',    // 4도 (컬러)
    },
    premium: {
      coverPaper: '22050',   // 랑데뷰 300g
      innerPaper: '22020',   // 미색모조지 120g
      coverColor: '1001',
      innerColor: '1001',
    },
  }

  const pkg = packages[packageType]

  // 와우프레스 보내는 곳 (회사 주소)
  const dlvyfr: OrderDelivery = {
    name: '메모리콕',
    tel: '010-0000-0000',
    sd: '서울특별시',
    sgg: '중구',
    addr1: '을지로 100',
    addr2: '메모리콕',
  }

  const orderParams: OrderParams = {
    action: 'ord',
    ordreq: [[{
      prodno: 40196,  // 무선책자
      ordqty: String(quantity),
      ordcnt: '1',
      ordtitle: `메모리콕 자서전 (${orderId})`,
      ordbody: `메모리콕 자서전 인쇄 주문 - ${orderId}`,
      ordkey: orderId,
      prsjob: [
        // 표지
        {
          jobno: '3110',
          covercd: 1,
          sizeno: '10507',  // A5 (148x210)
          jobqty: String(quantity),
          paperno: pkg.coverPaper,
          colorno0: pkg.coverColor,
          colorno0add: '',
        },
        // 내지
        {
          jobno: '3110',
          covercd: 2,
          sizeno: '10507',
          jobqty: String(pageCount),
          paperno: pkg.innerPaper,
          colorno0: pkg.innerColor,
          colorno0add: '',
        },
      ],
      awkjob: [],
    }]],
    dlvymcd: '4',  // 선불택배
    dlvyfr,
    dlvyto: deliveryTo,
  }

  return createOrder(orderParams)
}
