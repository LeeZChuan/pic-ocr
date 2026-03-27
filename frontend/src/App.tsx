import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import ContractOcrUploadPage from '@/pages/contractOcrUpload'
import ContractOcrEditorPage from '@/pages/contractOcrEditor'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ContractOcrUploadPage />} />
        <Route path="/editor" element={<ContractOcrEditorPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
