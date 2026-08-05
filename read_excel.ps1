$excel = New-Object -ComObject Excel.Application
$excel.Visible = $false
$wb = $excel.Workbooks.Open("C:\Users\win\Desktop\Agent Platform\AI中台功能清单-0625(1).xlsx")
$ws = $wb.Worksheets.Item(1)
$usedRange = $ws.UsedRange
$rows = $usedRange.Rows.Count
$cols = $usedRange.Columns.Count
Write-Host "Sheet: $($ws.Name) | Rows: $rows | Cols: $cols"
Write-Host "=============================================="
for ($r = 1; $r -le $rows; $r++) {
    $line = ""
    for ($c = 1; $c -le $cols; $c++) {
        $val = $ws.Cells.Item($r, $c).Text
        $line += "[$val]`t"
    }
    Write-Host $line
}
$wb.Close($false)
$excel.Quit()
[System.Runtime.InteropServices.Marshal]::ReleaseComObject($excel) | Out-Null
