import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Globe,
  FileText,
  CheckCircle,
  AlertCircle,
  Palette,
  Building,
  Phone,
  MapPin,
  DollarSign
} from 'lucide-react';
import { useCompany } from '../context/CompanyContext';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Input, { Textarea } from '../components/ui/Input';

function Admin() {
  const { company, updateCompany, refreshCompany } = useCompany();
  const [activeTab, setActiveTab] = useState('scraper');

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-3xl font-bold text-white mb-2">Setup & Configuration</h1>
        <p className="text-gray-400">
          Personalize the training experience for your company
        </p>
      </motion.div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <TabButton
          active={activeTab === 'scraper'}
          onClick={() => setActiveTab('scraper')}
          icon={Globe}
        >
          Website Scraper
        </TabButton>
        <TabButton
          active={activeTab === 'transcript'}
          onClick={() => setActiveTab('transcript')}
          icon={FileText}
        >
          Transcript Loader
        </TabButton>
        <TabButton
          active={activeTab === 'config'}
          onClick={() => setActiveTab('config')}
          icon={Building}
        >
          Company Info
        </TabButton>
      </div>

      {/* Tab Content */}
      {activeTab === 'scraper' && (
        <CompanyScraperTab company={company} updateCompany={updateCompany} />
      )}
      {activeTab === 'transcript' && (
        <TranscriptLoaderTab />
      )}
      {activeTab === 'config' && (
        <CompanyConfigTab company={company} updateCompany={updateCompany} />
      )}
    </div>
  );
}

function TabButton({ children, active, onClick, icon: Icon }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
        active
          ? 'bg-blue-600 text-white'
          : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
      }`}
    >
      <Icon className="w-4 h-4" />
      {children}
    </button>
  );
}

function CompanyScraperTab({ company, updateCompany }) {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleScrape = async () => {
    if (!url) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/admin/scrape-company', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to scrape website');
      }

      setResult(data.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async () => {
    if (!result?.extracted) return;

    const companyData = {
      name: result.extracted.name || company.name,
      phone: result.extracted.phone || company.phone,
      website: url,
      logo: result.logo,
      colors: result.colors || company.colors,
      serviceAreas: result.extracted.serviceAreas || company.serviceAreas,
      services: result.extracted.services || company.services,
      pricing: result.extracted.pricing || company.pricing,
      guarantees: result.extracted.guarantees || company.guarantees,
      valuePropositions: result.extracted.valuePropositions || company.valuePropositions,
      businessHours: result.extracted.businessHours || company.businessHours
    };

    await updateCompany(companyData);
    setResult(null);
    setUrl('');
  };

  return (
    <div className="space-y-6">
      <Card>
        <Card.Header>
          <Card.Title>Scrape Company Website</Card.Title>
          <Card.Description>
            Enter your company website URL to automatically extract branding and business information
          </Card.Description>
        </Card.Header>
        <Card.Content>
          <div className="flex gap-4">
            <div className="flex-1">
              <Input
                placeholder="https://www.yourcompany.com"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                icon={Globe}
              />
            </div>
            <Button onClick={handleScrape} loading={loading} disabled={!url}>
              Scrape Website
            </Button>
          </div>

          {error && (
            <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
              <p className="text-sm text-red-300">{error}</p>
            </div>
          )}
        </Card.Content>
      </Card>

      {result && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card>
            <Card.Header>
              <Card.Title>Extracted Data</Card.Title>
              <Card.Description>Review and apply the scraped information</Card.Description>
            </Card.Header>
            <Card.Content>
              <div className="grid md:grid-cols-2 gap-6">
                {/* Logo & Colors */}
                <div>
                  <h4 className="text-sm font-medium text-gray-300 mb-3">Branding</h4>
                  {result.logo && (
                    <div className="mb-4">
                      <img
                        src={result.logo}
                        alt="Company logo"
                        className="max-h-16 object-contain bg-white rounded p-2"
                      />
                    </div>
                  )}
                  {result.colors && (
                    <div className="flex gap-2">
                      {Object.entries(result.colors).map(([key, color]) => (
                        color && (
                          <div key={key} className="text-center">
                            <div
                              className="w-10 h-10 rounded-lg border border-gray-600"
                              style={{ backgroundColor: color }}
                            />
                            <span className="text-xs text-gray-500">{key}</span>
                          </div>
                        )
                      ))}
                    </div>
                  )}
                </div>

                {/* Business Info */}
                <div>
                  <h4 className="text-sm font-medium text-gray-300 mb-3">Business Info</h4>
                  <div className="space-y-2 text-sm">
                    {result.extracted?.name && (
                      <p className="text-gray-300">
                        <span className="text-gray-500">Name:</span> {result.extracted.name}
                      </p>
                    )}
                    {result.extracted?.phone && (
                      <p className="text-gray-300">
                        <span className="text-gray-500">Phone:</span> {result.extracted.phone}
                      </p>
                    )}
                    {result.extracted?.serviceAreas && (
                      <p className="text-gray-300">
                        <span className="text-gray-500">Areas:</span> {result.extracted.serviceAreas.join(', ')}
                      </p>
                    )}
                  </div>
                </div>

                {/* Services */}
                {result.extracted?.services && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-300 mb-3">Services</h4>
                    <div className="flex flex-wrap gap-2">
                      {result.extracted.services.slice(0, 8).map((service, i) => (
                        <span
                          key={i}
                          className="px-2 py-1 bg-gray-700 rounded text-xs text-gray-300"
                        >
                          {service}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Pricing */}
                {result.extracted?.pricing && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-300 mb-3">Pricing</h4>
                    <div className="space-y-1 text-sm text-gray-300">
                      {result.extracted.pricing.quarterlyPrice && (
                        <p>Quarterly: ${result.extracted.pricing.quarterlyPrice}</p>
                      )}
                      {result.extracted.pricing.initialPrice && (
                        <p>Initial: ${result.extracted.pricing.initialPrice}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </Card.Content>
            <Card.Footer className="flex justify-end gap-4">
              <Button variant="secondary" onClick={() => setResult(null)}>
                Cancel
              </Button>
              <Button onClick={handleApply} icon={CheckCircle}>
                Apply Configuration
              </Button>
            </Card.Footer>
          </Card>
        </motion.div>
      )}
    </div>
  );
}

function TranscriptLoaderTab() {
  const [transcript, setTranscript] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleAnalyze = async () => {
    if (!transcript.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/admin/load-transcript', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to analyze transcript');
      }

      setResult(data.intelligence);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <Card.Header>
          <Card.Title>Load Conversation Transcript</Card.Title>
          <Card.Description>
            Paste a real customer conversation to extract intelligence and generate custom scenarios
          </Card.Description>
        </Card.Header>
        <Card.Content>
          <Textarea
            placeholder="Paste your conversation transcript here...

Example:
CSR: Thank you for calling Accel Pest Control, this is Sarah speaking. How can I help you today?
Customer: Hi, I need to cancel my service...
CSR: I'm sorry to hear that..."
            rows={10}
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
          />
          <div className="mt-4 flex justify-end">
            <Button
              onClick={handleAnalyze}
              loading={loading}
              disabled={!transcript.trim()}
            >
              Analyze Transcript
            </Button>
          </div>

          {error && (
            <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
              <p className="text-sm text-red-300">{error}</p>
            </div>
          )}
        </Card.Content>
      </Card>

      {result && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Pain Points */}
          {result.painPoints && result.painPoints.length > 0 && (
            <Card>
              <Card.Header>
                <Card.Title>Identified Pain Points</Card.Title>
              </Card.Header>
              <Card.Content>
                <div className="space-y-3">
                  {result.painPoints.map((point, i) => (
                    <div key={i} className="p-3 bg-red-500/10 rounded-lg border border-red-500/20">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-red-300">{point.issue}</span>
                        <span className={`text-xs px-2 py-0.5 rounded ${
                          point.severity === 'high' ? 'bg-red-500/20 text-red-400' :
                          point.severity === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                          'bg-gray-500/20 text-gray-400'
                        }`}>
                          {point.severity}
                        </span>
                      </div>
                      {point.quote && (
                        <p className="text-sm text-gray-400 italic">"{point.quote}"</p>
                      )}
                    </div>
                  ))}
                </div>
              </Card.Content>
            </Card>
          )}

          {/* Suggested Scenarios */}
          {result.suggestedScenarios && result.suggestedScenarios.length > 0 && (
            <Card>
              <Card.Header>
                <Card.Title>Suggested Training Scenarios</Card.Title>
              </Card.Header>
              <Card.Content>
                <div className="space-y-3">
                  {result.suggestedScenarios.map((scenario, i) => (
                    <div key={i} className="p-4 bg-blue-500/10 rounded-lg border border-blue-500/20">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-blue-300">{scenario.name}</h4>
                        <span className={`text-xs px-2 py-0.5 rounded ${
                          scenario.difficulty === 'hard' ? 'bg-red-500/20 text-red-400' :
                          scenario.difficulty === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                          'bg-green-500/20 text-green-400'
                        }`}>
                          {scenario.difficulty}
                        </span>
                      </div>
                      <p className="text-sm text-gray-300 mb-2">{scenario.description}</p>
                      <p className="text-xs text-gray-500">Based on: {scenario.basedOn}</p>
                    </div>
                  ))}
                </div>
              </Card.Content>
            </Card>
          )}

          {/* Coaching Insights */}
          {result.coachingInsights && (
            <Card>
              <Card.Header>
                <Card.Title>Coaching Insights</Card.Title>
              </Card.Header>
              <Card.Content>
                <div className="space-y-4">
                  {result.coachingInsights.recommendedFocus && (
                    <div className="p-4 bg-purple-500/10 rounded-lg border border-purple-500/20">
                      <h4 className="font-medium text-purple-300 mb-1">Recommended Focus</h4>
                      <p className="text-sm text-gray-300">{result.coachingInsights.recommendedFocus}</p>
                    </div>
                  )}
                  <div className="grid md:grid-cols-2 gap-4">
                    {result.coachingInsights.strengthsToReinforce && (
                      <div>
                        <h4 className="text-sm font-medium text-green-400 mb-2">Strengths to Reinforce</h4>
                        <ul className="space-y-1">
                          {result.coachingInsights.strengthsToReinforce.map((s, i) => (
                            <li key={i} className="text-sm text-gray-300 flex items-start gap-2">
                              <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                              {s}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {result.coachingInsights.areasToAddress && (
                      <div>
                        <h4 className="text-sm font-medium text-yellow-400 mb-2">Areas to Address</h4>
                        <ul className="space-y-1">
                          {result.coachingInsights.areasToAddress.map((a, i) => (
                            <li key={i} className="text-sm text-gray-300 flex items-start gap-2">
                              <AlertCircle className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
                              {a}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </Card.Content>
            </Card>
          )}
        </motion.div>
      )}
    </div>
  );
}

function CompanyConfigTab({ company, updateCompany }) {
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState(company);

  const handleSave = async () => {
    await updateCompany(formData);
    setEditing(false);
  };

  return (
    <div className="space-y-6">
      <Card>
        <Card.Header>
          <div className="flex items-center justify-between">
            <div>
              <Card.Title>Company Information</Card.Title>
              <Card.Description>
                This information is used to personalize training scenarios
              </Card.Description>
            </div>
            {!editing && (
              <Button variant="secondary" onClick={() => setEditing(true)}>
                Edit
              </Button>
            )}
          </div>
        </Card.Header>
        <Card.Content>
          {editing ? (
            <div className="space-y-4">
              <Input
                label="Company Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                icon={Building}
              />
              <Input
                label="Phone Number"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                icon={Phone}
              />
              <Input
                label="Website"
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                icon={Globe}
              />
              <div className="grid md:grid-cols-2 gap-4">
                <Input
                  label="Quarterly Price"
                  value={formData.pricing?.quarterlyPrice || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    pricing: { ...formData.pricing, quarterlyPrice: e.target.value }
                  })}
                  icon={DollarSign}
                />
                <Input
                  label="Initial Price"
                  value={formData.pricing?.initialPrice || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    pricing: { ...formData.pricing, initialPrice: e.target.value }
                  })}
                  icon={DollarSign}
                />
              </div>
              <Textarea
                label="Services (comma-separated)"
                value={formData.services?.join(', ') || ''}
                onChange={(e) => setFormData({
                  ...formData,
                  services: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                })}
                rows={3}
              />
              <Textarea
                label="Service Areas (comma-separated)"
                value={formData.serviceAreas?.join(', ') || ''}
                onChange={(e) => setFormData({
                  ...formData,
                  serviceAreas: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                })}
                rows={2}
              />
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <InfoItem icon={Building} label="Name" value={company.name} />
                <InfoItem icon={Phone} label="Phone" value={company.phone} />
                <InfoItem icon={Globe} label="Website" value={company.website} />
                <InfoItem icon={DollarSign} label="Quarterly Price" value={`$${company.pricing?.quarterlyPrice}`} />
              </div>
              <div className="space-y-4">
                <div>
                  <span className="text-sm text-gray-500">Services</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {company.services?.slice(0, 6).map((s, i) => (
                      <span key={i} className="px-2 py-0.5 bg-gray-700 rounded text-xs text-gray-300">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Service Areas</span>
                  <p className="text-gray-300">{company.serviceAreas?.join(', ')}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Guarantees</span>
                  <p className="text-gray-300">{company.guarantees?.[0]}</p>
                </div>
              </div>
            </div>
          )}
        </Card.Content>
        {editing && (
          <Card.Footer className="flex justify-end gap-4">
            <Button variant="secondary" onClick={() => { setFormData(company); setEditing(false); }}>
              Cancel
            </Button>
            <Button onClick={handleSave} icon={CheckCircle}>
              Save Changes
            </Button>
          </Card.Footer>
        )}
      </Card>

      {/* Color Preview */}
      <Card>
        <Card.Header>
          <Card.Title>Brand Colors</Card.Title>
        </Card.Header>
        <Card.Content>
          <div className="flex gap-4">
            {company.colors && Object.entries(company.colors).map(([key, color]) => (
              color && (
                <div key={key} className="text-center">
                  <div
                    className="w-16 h-16 rounded-lg border border-gray-600 shadow-lg"
                    style={{ backgroundColor: color }}
                  />
                  <span className="text-xs text-gray-500 mt-1 block">{key}</span>
                  <span className="text-xs text-gray-400">{color}</span>
                </div>
              )
            ))}
          </div>
        </Card.Content>
      </Card>
    </div>
  );
}

function InfoItem({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-3">
      <Icon className="w-4 h-4 text-gray-500" />
      <div>
        <span className="text-xs text-gray-500">{label}</span>
        <p className="text-gray-300">{value || '-'}</p>
      </div>
    </div>
  );
}

export default Admin;
