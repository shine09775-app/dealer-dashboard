# CPAC Wangjai Dashboard

ไฟล์นี้อธิบายโครงสร้างและพฤติกรรมของ `cpac_wangjai_dashboard.html` ซึ่งเป็นหน้า Dashboard แบบ single-file สำหรับแสดงภาพรวมการใช้งานระบบ CPAC AI วางใจในเครือข่าย Dealer

## ภาพรวม

- ประเภทไฟล์: Static HTML prototype แบบไฟล์เดียว
- เทคโนโลยีหลัก: HTML, CSS, Vanilla JavaScript, Chart.js
- ฟอนต์ที่ใช้: IBM Plex Sans Thai, IBM Plex Mono
- จุดประสงค์: แสดงข้อมูล Dealer, กลุ่ม LINE, usage analytics และ network view ในหน้าเดียว

## หน้าที่อยู่ในไฟล์

ไฟล์นี้แบ่งเป็นหลาย page panel และสลับหน้าโดยใช้ฟังก์ชัน `goPage()`:

1. `overview` แสดง KPI, กราฟภาพรวม, Top 10 Dealers และรายการ Dealers ที่ไม่ active
2. `dealers` แสดงตาราง Dealer ทั้งหมด พร้อมค้นหา, filter, sort และ expand รายละเอียดกลุ่ม
3. `tree` แสดงโครงสร้างแบบลำดับชั้น `CPAC -> Dealer -> LINE Group`
4. `analytics` แสดงกราฟ usage เพิ่มเติม เช่น Daily Messages, Customer Type, Booking vs Volume และ Heatmap
5. `network` แสดง network view แบบ `CPAC -> Region -> Dealer -> Customer Groups`
6. `settings` เป็น placeholder สำหรับ configuration panel ในอนาคต

## ความสัมพันธ์ระหว่าง Tree View และ Network View

`Tree View` และ `Network View` ใช้ข้อมูลชุดเดียวกันจาก `ALL_DEALERS` และ `groupData` แต่แสดงผลคนละรูปแบบ:

- `Tree View` เน้นมุมมองแบบลำดับชั้นและการ drill down ทีละ node
- `Network View` เน้นมุมมองเชิงภาพรวม เพื่อให้เห็นโครงสร้างเครือข่ายจาก root ไปยัง region, dealer และ customer groups ในหน้าเดียว

กล่าวอีกแบบคือ `Network View` เป็น visualization ของ hierarchy เดียวกับ `Tree View` โดยแปลงจาก:

- `CPAC`
- `Region`
- `Dealer`
- `LINE Group`

มาเป็น node และ summary card ที่อ่านได้เร็วขึ้น

## การแปลงข้อมูล Tree View ไปเป็น Network View

การ render `Network View` อาศัยข้อมูลจาก object Dealer และกลุ่มย่อยใน `groupData` โดยมี mapping หลักดังนี้:

- Root node: ใช้ CPAC เป็น node หลักของระบบ
- Region column: group ข้อมูลจาก `ALL_DEALERS` ตามค่า `region`
- Dealer node: ใช้ข้อมูลจากแต่ละ Dealer เช่น `name`, `status`, `groups`, `active_groups`, `messages`, `volume`
- Group dots: ใช้ข้อมูลจาก `groupData` ของ Dealer เพื่อแทน customer groups แบบย่อ

ใน `Network View` กลุ่มย่อยไม่ได้แสดงเป็น tree item แบบเต็มเหมือน `Tree View` แต่ลดรูปเป็น visual marker เพื่อให้เห็น density และ composition ของแต่ละ Dealer ได้เร็วขึ้น

## องค์ประกอบ Visualization ของ Network View

`renderNetworkView()` สร้าง visualization จากข้อมูลลำดับชั้นเดียวกับ `renderTree()` โดยมีองค์ประกอบหลักดังนี้:

- Root summary แสดงจำนวน Dealers, จำนวนกลุ่ม, และ Active rate
- Region block แสดงจำนวน Dealer, จำนวน active dealer และจำนวนกลุ่มใน region นั้น
- Dealer node แสดงสถานะ, จำนวนกลุ่ม, volume, messages และ active groups
- Group dot แสดงประเภทของกลุ่มย่อยใน Dealer นั้น

การใช้สีใน `Network View`:

- สีของ region มาจาก `NV_REGIONS_COLORS`
- สีของ group type มาจาก `NV_GROUP_COLORS`
- ความทึบของ dot ใช้แยก active group กับ inactive group

## Filter ที่มีผลต่อ Visualization

`Network View` รองรับ filter ที่นำข้อมูล hierarchy เดิมมาคัดก่อน render:

- `nv-region` กรองตาม region
- `nv-status` กรองตามสถานะ Dealer
- `nv-mingroups` กรอง Dealer ตามจำนวนกลุ่มขั้นต่ำ
- `nv-search` ค้นหาจากชื่อ Dealer และจังหวัด

หลัง filter แล้วระบบจะคำนวณ summary ใหม่ทั้งหมด เช่น:

- จำนวน Dealer ที่เหลือ
- จำนวน active dealer
- จำนวนกลุ่มรวม
- volume รวม

ทำให้ `Network View` เป็น visualization ที่ตอบสนองกับข้อมูลแบบเดียวกับ `Tree View` แต่เหมาะกับการมองภาพรวมมากกว่า

## แหล่งข้อมูล

- ข้อมูลทั้งหมดในไฟล์นี้เป็น mock data ที่สร้างใน JavaScript
- ตัวแปรหลักคือ `ALL_DEALERS`
- จำนวน Dealer ที่สร้างคือ `432` ราย
- Region หลักมี 6 กลุ่ม:
  - `RMC Metro`
  - `RMC East`
  - `RMC West`
  - `RMC North`
  - `RMC Northeast`
  - `RMC South`
- ข้อมูลถูก generate จากชุดข้อมูลจังหวัด, prefix ชื่อ Dealer, ประเภทกลุ่ม และฟังก์ชันสุ่มแบบ deterministic (`rng`, `ri`)

## โครงสร้างข้อมูล Dealer

แต่ละ Dealer ใน `ALL_DEALERS` มี field หลักดังนี้:

- `id`
- `name`
- `region`
- `province`
- `groups`
- `active_groups`
- `messages`
- `volume`
- `daysSince`
- `status`
- `groupData`

แต่ละรายการใน `groupData` มีข้อมูล เช่น:

- `id`
- `name`
- `type`
- `messages`
- `price_check`
- `booking`
- `create_cust`
- `volume`
- `active`
- `last_active_days`

## ฟังก์ชันสำคัญ

- `goPage()` สลับหน้าและ trigger การ render ตาม panel ที่เลือก
- `applyFilters()` filter ข้อมูลหน้า overview
- `filterDealers()` filter ตาราง Dealer
- `sortDealers()` sort ตารางตาม column
- `renderDealerTable()` render ตารางและ expandable row
- `renderTop10()` render Top 10 Dealers ตาม volume
- `renderIdle()` render รายชื่อ Dealer ที่ไม่ active
- `renderTree()` render tree view
- `treeDetail()` แสดงรายละเอียด node ที่เลือก
- `renderNetworkView()` render network visualization จากโครงสร้างเดียวกับ tree
- `initOverviewCharts()` สร้างกราฟภาพรวม
- `initAnalyticsCharts()` สร้างกราฟหน้า analytics
- `renderHeatmap()` render heatmap ของ Dealer adoption
- `resetNetworkFilters()` reset filter ของหน้า network

## Dependency ภายนอก

- Google Fonts
- Chart.js 4.4.1 จาก CDN

## ข้อสังเกตทางเทคนิค

- ไฟล์นี้เป็น prototype ฝั่ง frontend ยังไม่เชื่อมฐานข้อมูลหรือ API ภายนอก
- หน้า `settings` ยังเป็น placeholder
- มีการกำหนด script block ด้านบนแบบ `script src="..."` พร้อม inline JavaScript ใน block เดียวกัน ซึ่งควรตรวจสอบการทำงานใน browser หากจะนำไปใช้งานจริง

## การใช้งาน

- เปิดไฟล์ `cpac_wangjai_dashboard.html` ด้วย browser
- ใช้ sidebar หรือ tab เพื่อสลับแต่ละมุมมอง
- ข้อมูลที่แสดงจะเปลี่ยนตาม filter, search, sort และ action ภายในแต่ละหน้า
