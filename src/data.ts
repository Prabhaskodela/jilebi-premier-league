export type Franchise = { name: string; code: string; city: string; colors: [string, string] }
export const franchises: Franchise[] = [
  { name: 'Chennai Super Kings', code: 'CSK', city: 'CHENNAI', colors: ['#f5c928', '#162f72'] },
  { name: 'Mumbai Indians', code: 'MI', city: 'MUMBAI', colors: ['#1769aa', '#d7a92e'] },
  { name: 'Royal Challengers Bengaluru', code: 'RCB', city: 'BENGALURU', colors: ['#c82436', '#171717'] },
  { name: 'Kolkata Knight Riders', code: 'KKR', city: 'KOLKATA', colors: ['#563280', '#d3a437'] },
  { name: 'Sunrisers Hyderabad', code: 'SRH', city: 'HYDERABAD', colors: ['#ec6827', '#18233d'] },
  { name: 'Rajasthan Royals', code: 'RR', city: 'JAIPUR', colors: ['#df6d9c', '#1a3677'] },
  { name: 'Punjab Kings', code: 'PBKS', city: 'PUNJAB', colors: ['#cf2639', '#d7d7d7'] },
  { name: 'Delhi Capitals', code: 'DC', city: 'DELHI', colors: ['#2778c4', '#d73140'] },
  { name: 'Gujarat Titans', code: 'GT', city: 'AHMEDABAD', colors: ['#17446c', '#a9bdc6'] },
  { name: 'Lucknow Super Giants', code: 'LSG', city: 'LUCKNOW', colors: ['#2f8fb7', '#ed6d87'] },
]

export const roomCode = () => Math.random().toString(36).slice(2, 6).toUpperCase()

