import { useEffect, useRef, useState } from 'react';
import {
  Row, Col, Card, Button, Modal, Form, Input, Select,
  InputNumber, Popconfirm, message, Tag, Upload,
} from 'antd';
import { PlusOutlined, DeleteOutlined, UploadOutlined } from '@ant-design/icons';
import { appConfig } from '@pawroute/config';
import { api } from '../lib/api';

const c = appConfig.brand.colors;

interface GalleryImage {
  id: string;
  imageUrl: string;
  thumbnailUrl: string;
  petType?: string;
  beforeAfterType: string;
  caption?: string;
  sortOrder: number;
}

export default function GalleryPage() {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadModal, setUploadModal] = useState(false);
  const [form] = Form.useForm();
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    setLoading(true);
    try {
      const r = await api.get('/gallery');
      setImages(r.data.data);
    } catch { message.error('Failed to load gallery'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleUpload = async () => {
    if (!file) { message.warning('Select an image first'); return; }
    const vals = await form.validateFields();
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('image', file);
      formData.append('caption', vals.caption ?? '');
      formData.append('petType', vals.petType ?? '');
      formData.append('beforeAfterType', vals.beforeAfterType ?? 'GENERAL');
      formData.append('sortOrder', String(vals.sortOrder ?? 0));

      await api.post('/gallery', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      message.success('Image uploaded');
      setUploadModal(false);
      form.resetFields();
      setFile(null);
      load();
    } catch { message.error('Upload failed'); }
    finally { setUploading(false); }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/gallery/${id}`);
      message.success('Deleted');
      load();
    } catch { message.error('Failed to delete'); }
  };

  const TYPE_COLORS: Record<string, string> = {
    BEFORE: 'orange', AFTER: 'green', GENERAL: 'default',
  };

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ margin: 0, color: c.primary, fontSize: 22, fontWeight: 700 }}>Gallery</h1>
        <Button type="primary" icon={<PlusOutlined />}
          style={{ backgroundColor: c.primary }}
          onClick={() => { form.resetFields(); setFile(null); setUploadModal(true); }}>
          Upload Image
        </Button>
      </div>

      <Row gutter={[12, 12]}>
        {images.map((img) => (
          <Col key={img.id} xs={12} sm={8} md={6} lg={4}>
            <Card
              size="small"
              bodyStyle={{ padding: 6 }}
              cover={
                <div style={{ position: 'relative' }}>
                  <img src={img.thumbnailUrl} alt={img.caption ?? ''} style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', borderRadius: '8px 8px 0 0' }} />
                  <Tag color={TYPE_COLORS[img.beforeAfterType]} style={{ position: 'absolute', top: 4, left: 4, fontSize: 10 }}>
                    {img.beforeAfterType}
                  </Tag>
                </div>
              }
              actions={[
                <Popconfirm key="del" title="Delete image?" onConfirm={() => handleDelete(img.id)}>
                  <DeleteOutlined style={{ color: '#EF4444' }} />
                </Popconfirm>,
              ]}>
              <div style={{ fontSize: 11, color: '#6b7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {img.caption || (img.petType ?? 'General')}
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      {images.length === 0 && !loading && (
        <div style={{ textAlign: 'center', padding: '64px 0', color: '#9ca3af' }}>
          No gallery images yet. Upload some!
        </div>
      )}

      <Modal
        title="Upload Gallery Image"
        open={uploadModal}
        onOk={handleUpload}
        onCancel={() => setUploadModal(false)}
        confirmLoading={uploading}
        okText="Upload"
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item label="Image">
            <input type="file" accept="image/*" ref={fileRef}
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              style={{ display: 'none' }} />
            <Button icon={<UploadOutlined />} onClick={() => fileRef.current?.click()}>
              {file ? file.name : 'Choose Image'}
            </Button>
          </Form.Item>
          <Form.Item name="caption" label="Caption">
            <Input placeholder="e.g. Before & after transformation" />
          </Form.Item>
          <Form.Item name="petType" label="Pet Type">
            <Select allowClear placeholder="All pets">
              <Select.Option value="DOG">🐶 Dog</Select.Option>
              <Select.Option value="CAT">🐱 Cat</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="beforeAfterType" label="Type" initialValue="GENERAL">
            <Select>
              <Select.Option value="GENERAL">General</Select.Option>
              <Select.Option value="BEFORE">Before</Select.Option>
              <Select.Option value="AFTER">After</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="sortOrder" label="Sort Order" initialValue={0}>
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
