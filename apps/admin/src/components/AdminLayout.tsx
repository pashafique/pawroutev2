import { Layout, Menu, theme } from 'antd';
import {
  DashboardOutlined, CalendarOutlined, TeamOutlined, ShopOutlined,
  ClockCircleOutlined, CreditCardOutlined, TagOutlined, PictureOutlined,
  BellOutlined, SettingOutlined, UserSwitchOutlined, PawPrint,
} from '@ant-design/icons';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { appConfig } from '@pawroute/config';

const { Sider, Content, Header } = Layout;

const menuItems = [
  { key: '/dashboard',     icon: <DashboardOutlined />,    label: 'Dashboard' },
  { key: '/appointments',  icon: <CalendarOutlined />,     label: 'Appointments' },
  { key: '/customers',     icon: <TeamOutlined />,         label: 'Customers' },
  { key: '/pets',          icon: <span>🐾</span>,          label: 'Pets' },
  { key: '/services',      icon: <ShopOutlined />,         label: 'Services' },
  { key: '/slots',         icon: <ClockCircleOutlined />,  label: 'Time Slots' },
  { key: '/payments',      icon: <CreditCardOutlined />,   label: 'Payments' },
  { key: '/coupons',       icon: <TagOutlined />,          label: 'Coupons' },
  { key: '/gallery',       icon: <PictureOutlined />,      label: 'Gallery' },
  { key: '/notifications', icon: <BellOutlined />,         label: 'Notifications' },
  { key: '/settings',      icon: <SettingOutlined />,      label: 'Settings' },
  { key: '/users',         icon: <UserSwitchOutlined />,   label: 'Admin Users' },
];

export default function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        breakpoint="lg"
        collapsedWidth={0}
        theme="dark"
        style={{ background: appConfig.brand.colors.primary }}
      >
        {/* Logo */}
        <div
          style={{
            height: 64,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderBottom: `1px solid ${appConfig.brand.colors.primaryLight}`,
          }}
        >
          <span style={{ color: '#fff', fontWeight: 700, fontSize: 18 }}>
            🐾 {appConfig.product.name}
          </span>
        </div>

        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
          style={{ background: 'transparent', borderRight: 0 }}
        />
      </Sider>

      <Layout>
        <Header
          style={{
            background: '#fff',
            padding: '0 24px',
            boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span style={{ color: appConfig.brand.colors.textSecondary, fontSize: 13 }}>
            {appConfig.product.name} Admin Panel
          </span>
        </Header>
        <Content style={{ margin: '24px', background: appConfig.brand.colors.surfaceAlt }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
