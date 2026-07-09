import ExcelJS from 'exceljs'
import { saveAs } from 'file-saver'

export type ExcelCell = string | number | boolean | Date | null | undefined
export type ExcelRow = Record<string, ExcelCell>

export const createWorkbook = () => new ExcelJS.Workbook()

export const addObjectSheet = (
  workbook: ExcelJS.Workbook,
  name: string,
  rows: ExcelRow[],
  headers: string[],
  widths: number[] = [],
) => {
  const sheet = workbook.addWorksheet(name)
  sheet.addRow(headers)
  rows.forEach((row) => {
    sheet.addRow(headers.map((header) => row[header]))
  })
  widths.forEach((width, index) => {
    sheet.getColumn(index + 1).width = width
  })
  return sheet
}

export const downloadWorkbook = async (workbook: ExcelJS.Workbook, fileName: string) => {
  const buffer = await workbook.xlsx.writeBuffer()
  saveAs(
    new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    }),
    fileName,
  )
}
