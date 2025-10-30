import React, { useState, useEffect } from 'react';
import { getOrCreateSession, getCurrentSession } from '../utils/sessionManager';
import { initAgentUI } from '../services/agentUI';
import { queryAgent } from '../services/api';
import { useAssistId } from '../hooks/useAssistId';
import FormModal from './FormModal';
import './FogCityApp.css';

const API_BASE_URL = process.env.REACT_APP_BROKER_API_URL || 'http://localhost:3001';

interface AgentMessage {
  sender: 'user' | 'agent';
  text: string;
  timestamp: Date;
}

interface AgentChatProps {
  agentName: string;
  agentTitle: string;
  agentEmoji: string;
  formId: string;
  contextId: string | null;
  initialMessage: string;
  quickActions: { label: string; action: string }[];
  onActionClick: (action: string) => void;
}

const AgentChat: React.FC<AgentChatProps> = ({
  agentName,
  agentTitle,
  agentEmoji,
  formId,
  contextId,
  initialMessage,
  quickActions,
  onActionClick,
}) => {
  const [messages, setMessages] = useState<AgentMessage[]>([
    {
      sender: 'agent',
      text: initialMessage,
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const chatRef = React.useRef<HTMLDivElement>(null);

  const sendMessage = async (text: string) => {
    if (!text.trim() || !contextId) return;

    // Add user message
    const userMessage: AgentMessage = {
      sender: 'user',
      text,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setLoading(true);

    // Scroll to bottom
    setTimeout(() => {
      chatRef.current?.scrollTo(0, chatRef.current.scrollHeight);
    }, 100);

    try {
      // Query real Salesforce agent via broker
      const response = await queryAgent(formId, contextId, text);
      
      // Add agent response
      const agentMessage: AgentMessage = {
        sender: 'agent',
        text: response.response || 'I understand. Let me help you with that!',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, agentMessage]);
    } catch (error: any) {
      // Fallback response
      const agentMessage: AgentMessage = {
        sender: 'agent',
        text: `I understand you're asking about "${text}". Let me help you with that! Based on your needs, I can provide personalized recommendations.`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, agentMessage]);
    } finally {
      setLoading(false);
      setTimeout(() => {
        chatRef.current?.scrollTo(0, chatRef.current.scrollHeight);
      }, 100);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(inputValue);
  };

  return (
    <aside className="agent-sidebar" data-assist-panel={`panel:agent:${agentName.toLowerCase()}`}>
      <div className="agent-avatar">{agentEmoji}</div>
      <div className="agent-name">{agentName}</div>
      <div className="agent-title">{agentTitle}</div>
      <div className="agent-chat" ref={chatRef}>
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`chat-message ${
              msg.sender === 'agent' ? 'agent-message' : 'user-message'
            }`}
          >
            {msg.text}
          </div>
        ))}
        {loading && (
          <div className="chat-message agent-message">
            <span className="typing-indicator">🤔 Thinking...</span>
          </div>
        )}
      </div>
      <form className="chat-input" onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Ask me anything..."
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          disabled={loading || !contextId}
          data-assist-field="f:agentInput"
        />
        <button type="submit" disabled={loading || !contextId} data-assist-field="f:agentSend">
          Send
        </button>
      </form>
      <div className="agent-actions">
        {quickActions.map((action, idx) => (
          <button
            key={idx}
            className="quick-action"
            onClick={() => {
              onActionClick(action.action);
              sendMessage(action.action);
            }}
            data-assist-field={`f:quickAction:${idx}`}
          >
            {action.label}
          </button>
        ))}
      </div>
    </aside>
  );
};

type Page = 'home' | 'inventory' | 'service' | 'fleet' | 'about';

const FogCityApp: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<Page>('home');
  const [contextId, setContextId] = useState<string | null>(null);
  const routeRef = useAssistId('route', 'route:fog-city');

  // Filter state
  const [filters, setFilters] = useState({
    make: 'All Makes',
    priceRange: 'Any Price',
    fuelType: 'All Types'
  });

  // Vehicle data with filter support
  const [vehicles, setVehicles] = useState([
    {
      id: 'camry-hybrid-2024',
      name: '2024 Toyota Camry Hybrid',
      price: '$32,450',
      features: '8-Speed CVT • 52 MPG • Safety Sense 2.0',
      make: 'Toyota',
      priceValue: 32450,
      fuelType: 'Hybrid'
    },
    {
      id: 'tesla-model3-2024',
      name: '2024 Tesla Model 3',
      price: '$47,990',
      features: '350 Mile Range • Autopilot • Supercharger Network',
      make: 'Tesla',
      priceValue: 47990,
      fuelType: 'Electric'
    },
    {
      id: 'rav4-hybrid-2024',
      name: '2024 Toyota RAV4 Hybrid',
      price: '$39,200',
      features: 'AWD • 40 MPG • Adventure-Ready',
      make: 'Toyota',
      priceValue: 39200,
      fuelType: 'Hybrid'
    }
  ]);

  // Filter vehicles based on current filters
  const filteredVehicles = vehicles.filter(vehicle => {
    const makeMatch = filters.make === 'All Makes' || vehicle.make === filters.make;
    const priceMatch = filters.priceRange === 'Any Price' || 
      (filters.priceRange === 'Under $30k' && vehicle.priceValue < 30000) ||
      (filters.priceRange === '$30k - $50k' && vehicle.priceValue >= 30000 && vehicle.priceValue <= 50000) ||
      (filters.priceRange === 'Over $50k' && vehicle.priceValue > 50000);
    const fuelMatch = filters.fuelType === 'All Types' || vehicle.fuelType === filters.fuelType;
    
    return makeMatch && priceMatch && fuelMatch;
  });
  
  // Initialize agent UI service
  useEffect(() => {
    initAgentUI(API_BASE_URL);
    
    // Create session for the website (using "fog-city" as formId)
    const initSession = async () => {
      try {
        const session = await getOrCreateSession('fog-city-website', API_BASE_URL);
        setContextId(session.contextId);
      } catch (error) {
        console.error('Failed to create session:', error);
        // Fallback to client-side session
        const session = getCurrentSession('fog-city-website');
        if (session) {
          setContextId(session.contextId);
        }
      }
    };
    
    initSession();
  }, []);

  const showPage = (page: Page) => {
    setCurrentPage(page);
  };

  // Handle filter changes
  const handleFilterChange = (filterType: string, value: string) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: value
    }));
  };

  const handleAgentAction = (action: string) => {
    // Actions can trigger specific UI changes
    console.log('Agent action:', action);
    // Could implement navigation, modal opening, etc. based on action
  };

  return (
    <div className="website-container">
      {/* Navigation */}
      <nav className="nav-bar" data-assist-panel="panel:navigation">
        <div className="logo">Fog City Drive Solutions</div>
        <ul className="nav-links">
          <li>
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                showPage('home');
              }}
              className={currentPage === 'home' ? 'active' : ''}
            >
              Home
            </a>
          </li>
          <li>
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                showPage('inventory');
              }}
              className={currentPage === 'inventory' ? 'active' : ''}
            >
              Inventory
            </a>
          </li>
          <li>
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                showPage('service');
              }}
              className={currentPage === 'service' ? 'active' : ''}
            >
              Service
            </a>
          </li>
          <li>
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                showPage('fleet');
              }}
              className={currentPage === 'fleet' ? 'active' : ''}
            >
              Fleet
            </a>
          </li>
          <li>
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                showPage('about');
              }}
              className={currentPage === 'about' ? 'active' : ''}
            >
              About
            </a>
          </li>
        </ul>
      </nav>

      {/* Agent Status Bar */}
      <div className="agent-status-bar">
        <div className="active-agents">
          <div className="agent-indicator">
            <div className="agent-status-dot"></div>
            <span>Sales Concierge Online</span>
          </div>
          <div className="agent-indicator">
            <div className="agent-status-dot"></div>
            <span>Service Assistant Ready</span>
          </div>
          <div className="agent-indicator">
            <div className="agent-status-dot"></div>
            <span>Fleet Manager Available</span>
          </div>
        </div>
        <div>AI Agents • Always Here to Help • San Francisco, CA</div>
      </div>

      {/* Main Content Area */}
      <main ref={routeRef} data-assist-title="Fog City Drive Solutions">
        {/* Home Page */}
        {currentPage === 'home' && (
          <div className="page active" data-assist-view="view:home">
            <div className="hero-section">
              <h1 className="hero-title">The Future of Automotive is Here</h1>
              <p className="hero-subtitle">
                Experience San Francisco's first agent-first dealership where AI meets automotive
                excellence
              </p>
              <div className="cta-buttons">
                <button
                  className="cta-button"
                  onClick={() => showPage('inventory')}
                  data-assist-field="f:ctaInventory"
                >
                  Browse Vehicles
                </button>
                <button
                  className="cta-button"
                  onClick={() => showPage('service')}
                  data-assist-field="f:ctaService"
                >
                  Schedule Service
                </button>
                <button
                  className="cta-button"
                  onClick={() => showPage('fleet')}
                  data-assist-field="f:ctaFleet"
                >
                  Fleet Solutions
                </button>
              </div>
            </div>
            <div className="features-grid">
              <div className="feature-card">
                <div className="feature-icon">AI</div>
                <h3>AI-Powered Experience</h3>
                <p>
                  Our intelligent agents understand your needs and provide personalized
                  recommendations 24/7
                </p>
              </div>
              <div className="feature-card">
                <div className="feature-icon">SF</div>
                <h3>San Francisco Local</h3>
                <p>
                  Born and raised in the Bay Area, we understand SF's unique driving needs and
                  challenges
                </p>
              </div>
              <div className="feature-card">
                <div className="feature-icon">⚡</div>
                <h3>Instant Responses</h3>
                <p>
                  No waiting, no phone trees. Get answers and take action immediately with our
                  agent team
                </p>
              </div>
              <div className="feature-card">
                <div className="feature-icon">✓</div>
                <h3>Full Service</h3>
                <p>
                  Sales, Service, Finance, Insurance, and Field Service - everything you need in
                  one place
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Inventory Page */}
        {currentPage === 'inventory' && (
          <div className="page active" data-assist-view="view:inventory">
            <div className="page-content">
              <main className="main-content">
                <h1>Vehicle Inventory</h1>
                <div className="inventory-filters">
                  <div className="filter-grid">
                    <div className="filter-group">
                      <label>Make</label>
                      <select 
                        data-assist-field="f:filterMake" 
                        aria-label="Filter by vehicle make"
                        value={filters.make}
                        onChange={(e) => handleFilterChange('make', e.target.value)}
                      >
                        <option>All Makes</option>
                        <option>Toyota</option>
                        <option>Tesla</option>
                      </select>
                    </div>
                    <div className="filter-group">
                      <label>Price Range</label>
                      <select 
                        data-assist-field="f:filterPriceRange" 
                        aria-label="Filter by price range"
                        value={filters.priceRange}
                        onChange={(e) => handleFilterChange('priceRange', e.target.value)}
                      >
                        <option>Any Price</option>
                        <option>Under $30k</option>
                        <option>$30k - $50k</option>
                        <option>Over $50k</option>
                      </select>
                    </div>
                    <div className="filter-group">
                      <label>Fuel Type</label>
                      <select 
                        data-assist-field="f:filterFuelType" 
                        aria-label="Filter by fuel type"
                        value={filters.fuelType}
                        onChange={(e) => handleFilterChange('fuelType', e.target.value)}
                      >
                        <option>All Types</option>
                        <option>Hybrid</option>
                        <option>Electric</option>
                        <option>Gas</option>
                      </select>
                    </div>
                  </div>
                </div>
                <div className="vehicle-grid">
                  {filteredVehicles.map((vehicle) => (
                    <div key={vehicle.id} className="vehicle-card" data-assist-item={`item:vehicle:${vehicle.id}`}>
                      <div className="vehicle-image"></div>
                      <div className="vehicle-info">
                        <div className="vehicle-name">{vehicle.name}</div>
                        <div className="vehicle-price">{vehicle.price}</div>
                        <div className="vehicle-features">
                          {vehicle.features}
                        </div>
                        <div className="vehicle-actions">
                          <FormModal
                            formId="test-drive-form"
                            modalId={`modal:askAbout:${vehicle.id}`}
                            title="Ask About Vehicle"
                            itemContext={{
                              itemId: `item:vehicle:${vehicle.id}`,
                              itemMetadata: {
                                vehicle_name: vehicle.name,
                                vehicle_price: vehicle.price,
                                vehicle_features: vehicle.features,
                                vehicle_make: vehicle.make,
                                vehicle_fuel_type: vehicle.fuelType,
                              },
                            }}
                            triggerButton={
                              <button
                                className="btn-primary"
                                data-assist-field="f:askAboutVehicle"
                                data-assist-action="action:askAbout"
                                data-assist-item={`item:vehicle:${vehicle.id}`}
                              >
                                Ask Agent
                              </button>
                            }
                            onSuccess={(data) => {
                              console.log('Agent query sent:', data);
                            }}
                            onError={(error) => {
                              console.error('Agent query error:', error);
                            }}
                          />
                          <FormModal
                            formId="test-drive-form"
                            modalId={`modal:testDrive:${vehicle.id}`}
                            title="Schedule Test Drive"
                            itemContext={{
                              itemId: `item:vehicle:${vehicle.id}`,
                              itemMetadata: {
                                vehicle_name: vehicle.name,
                                vehicle_price: vehicle.price,
                                vehicle_features: vehicle.features,
                                vehicle_make: vehicle.make,
                                vehicle_fuel_type: vehicle.fuelType,
                              },
                            }}
                            triggerButton={
                              <button 
                                className="btn-secondary"
                                data-assist-field="f:testDrive"
                                data-assist-action="action:testDrive"
                                data-assist-item={`item:vehicle:${vehicle.id}`}
                              >
                                Test Drive
                              </button>
                            }
                            onSuccess={(data) => {
                              console.log('Test drive scheduled:', data);
                              alert(`Test drive scheduled for ${vehicle.name}! ${data.message || 'We\'ll contact you soon.'}`);
                            }}
                            onError={(error) => {
                              console.error('Test drive error:', error);
                              alert(`Error: ${error}`);
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                  {filteredVehicles.length === 0 && (
                    <div className="no-results">
                      <p>No vehicles match your current filters.</p>
                      <button 
                        className="btn-primary"
                        onClick={() => setFilters({ make: 'All Makes', priceRange: 'Any Price', fuelType: 'All Types' })}
                      >
                        Clear Filters
                      </button>
                    </div>
                  )}
                </div>
              </main>
              <AgentChat
                agentName="Alex"
                agentTitle="Sales Concierge Agent"
                agentEmoji="AI"
                formId="fog-city-inventory"
                contextId={contextId}
                initialMessage="Hi! I'm Alex, your AI Sales Concierge. I can help you find the perfect vehicle, get trade-in values, schedule test drives, and even pre-qualify you for financing. What are you looking for today?"
                quickActions={[
                  { label: 'Eco-Friendly Options', action: 'Show me hybrid vehicles under $40k' },
                  { label: 'SF-Optimized Vehicles', action: 'What vehicles work best in SF?' },
                  { label: 'Trade-In Value', action: 'Calculate my trade-in value' },
                  { label: 'Schedule Test Drive', action: 'Schedule a test drive' },
                ]}
                onActionClick={handleAgentAction}
              />
            </div>
          </div>
        )}

        {/* Service Page */}
        {currentPage === 'service' && (
          <div className="page active" data-assist-view="view:service">
            <div className="page-content">
              <main className="main-content">
                <h1>Vehicle Service</h1>
                <div className="service-categories">
                  <div className="service-category">
                    <div className="feature-icon">MAINT</div>
                    <h3>Maintenance</h3>
                    <p>Oil changes, tire rotations, inspections</p>
                  </div>
                  <div className="service-category">
                    <div className="feature-icon">REPAIR</div>
                    <h3>Repairs</h3>
                    <p>Engine, brakes, transmission, electrical</p>
                  </div>
                  <div className="service-category">
                    <div className="feature-icon">MOBILE</div>
                    <h3>Mobile Service</h3>
                    <p>We come to you in SF Bay Area</p>
                  </div>
                  <div className="service-category">
                    <div className="feature-icon">WARR</div>
                    <h3>Warranty</h3>
                    <p>Check coverage and file claims</p>
                  </div>
                </div>
                <div className="appointment-form">
                  <h3>Schedule Service Appointment</h3>
                  <p style={{ marginBottom: '1rem', color: '#666' }}>
                    This form can be rendered dynamically from Salesforce Form_Definition__c
                  </p>
                  {/* TODO: Replace with FormRenderer when form definition is created */}
                  <div className="form-grid">
                    <div className="form-group">
                      <label>Your Name</label>
                      <input type="text" placeholder="Enter your name" data-assist-field="f:name" />
                    </div>
                    <div className="form-group">
                      <label>Phone Number</label>
                      <input type="tel" placeholder="(555) 123-4567" data-assist-field="f:phone" />
                    </div>
                  </div>
                  <button className="btn-primary" style={{ width: '100%', marginTop: '1rem' }}>
                    Let AI Agent Schedule Appointment
                  </button>
                </div>
              </main>
              <AgentChat
                agentName="Sam"
                agentTitle="Service Assistant Agent"
                agentEmoji="SV"
                formId="fog-city-service"
                contextId={contextId}
                initialMessage="I'm Sam, your Service Assistant! I can diagnose issues, schedule appointments, check warranty coverage, and coordinate our mobile mechanics. How can I help with your vehicle today?"
                quickActions={[
                  { label: 'Check Engine Light', action: 'My check engine light is on' },
                  { label: 'Oil Change', action: 'Schedule oil change' },
                  { label: 'Mobile Service', action: 'Mobile service to my office' },
                  { label: 'Warranty Check', action: 'Check my warranty coverage' },
                ]}
                onActionClick={handleAgentAction}
              />
            </div>
          </div>
        )}

        {/* Fleet Page */}
        {currentPage === 'fleet' && (
          <div className="page active" data-assist-view="view:fleet">
            <div className="page-content">
              <main className="main-content">
                <h1>Fleet Solutions</h1>
                <p style={{ marginBottom: '2rem' }}>
                  Comprehensive fleet management for Bay Area businesses, from startups to enterprises.
                </p>
                {/* Fleet tiers content - keeping existing structure */}
                <div className="fleet-tiers">
                  <div className="tier-card">
                    <div className="tier-name">Startup Fleet</div>
                    <div className="tier-price">$299/mo</div>
                    <ul className="tier-features">
                      <li>Up to 5 vehicles</li>
                      <li>Basic maintenance included</li>
                      <li>Digital fleet dashboard</li>
                    </ul>
                    <button className="btn-primary" style={{ width: '100%' }}>
                      Get Started
                    </button>
                  </div>
                  <div className="tier-card popular">
                    <div className="tier-name">Growth Fleet</div>
                    <div className="tier-price">$199/vehicle</div>
                    <ul className="tier-features">
                      <li>Up to 50 vehicles</li>
                      <li>Full maintenance package</li>
                      <li>GPS tracking & analytics</li>
                      <li>24/7 AI agent support</li>
                    </ul>
                    <button className="btn-primary" style={{ width: '100%' }}>
                      Most Popular
                    </button>
                  </div>
                  <div className="tier-card">
                    <div className="tier-name">Enterprise Fleet</div>
                    <div className="tier-price">Custom</div>
                    <ul className="tier-features">
                      <li>Unlimited vehicles</li>
                      <li>White-glove service</li>
                      <li>Custom integrations</li>
                    </ul>
                    <button className="btn-primary" style={{ width: '100%' }}>
                      Contact Sales
                    </button>
                  </div>
                </div>
              </main>
              <AgentChat
                agentName="Morgan"
                agentTitle="Fleet Manager Agent"
                agentEmoji="FL"
                formId="fog-city-fleet"
                contextId={contextId}
                initialMessage="Hi! I'm Morgan, your Fleet Manager Agent. I specialize in B2B fleet solutions, usage analytics, maintenance scheduling, and contract management. What's your fleet challenge?"
                quickActions={[
                  { label: 'Fleet Calculator', action: 'Calculate fleet costs for 20 vehicles' },
                  { label: 'Delivery Fleet', action: 'Best vehicles for delivery in SF' },
                  { label: 'Fleet Maintenance', action: 'Schedule maintenance for entire fleet' },
                  { label: 'Usage Analytics', action: 'Generate usage analytics report' },
                ]}
                onActionClick={handleAgentAction}
              />
            </div>
          </div>
        )}

        {/* About Page */}
        {currentPage === 'about' && (
          <div className="page active" data-assist-view="view:about">
            <div className="page-content">
              <main className="main-content">
                <h1>Our Team: Humans + AI</h1>
                <p style={{ marginBottom: '2rem' }}>
                  Meet the future of automotive service - where human expertise meets AI efficiency.
                </p>
                <div className="team-grid">
                  <div className="team-member">
                    <div className="team-avatar human-avatar">MC</div>
                    <div className="member-name">Marcus Chen</div>
                    <div className="member-role">General Manager</div>
                    <div className="member-description">
                      20 years in automotive, leading our human team and ensuring our AI agents
                      deliver exceptional customer experiences.
                    </div>
                  </div>
                  <div className="team-member">
                    <div className="team-avatar ai-avatar">AI</div>
                    <div className="member-name">Alex</div>
                    <div className="member-role">Sales Concierge Agent</div>
                    <div className="member-description">
                      AI specialist in vehicle sales, financing, and customer preferences. Available
                      24/7 to help you find your perfect car.
                    </div>
                  </div>
                </div>
              </main>
              <AgentChat
                agentName="Jamie"
                agentTitle="Customer Experience Agent"
                agentEmoji="CX"
                formId="fog-city-about"
                contextId={contextId}
                initialMessage="I'm Jamie, your Customer Experience Agent! I'm here to ensure you have an amazing experience with our team. I can help you connect with the right people, gather feedback, or answer any questions about our services."
                quickActions={[
                  { label: 'Talk to Human', action: 'Connect me with a human' },
                  { label: 'Share Feedback', action: 'Give feedback on my experience' },
                  { label: 'Schedule Callback', action: 'Schedule a callback' },
                  { label: 'Loyalty Program', action: 'Join loyalty program' },
                ]}
                onActionClick={handleAgentAction}
              />
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default FogCityApp;

