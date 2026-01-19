"""
Mock Agent with Generative UI Tools

This example demonstrates all the generative UI capabilities:
- Revenue charts (bar/line)
- Rental car cards
- Product comparison tables
- Dashboard metrics
- Smart data visualization

Usage:
    python examples/mock-agent.py

Then connect the frontend to http://localhost:7777
"""

from agno.agent import Agent
from agno.db.sqlite import SqliteDb
from agno.models.anthropic import Claude
from agno.os import AgentOS
from agno.tools import tool
from typing import TypedDict, Literal

db = SqliteDb(db_file="tmp/data.db")

# ============================================================================
# TYPE DEFINITIONS
# ============================================================================

class RevenueData(TypedDict):
    month: str
    revenue: float
    expenses: float

class CarData(TypedDict):
    id: str
    name: str
    description: str
    price_per_day: float
    type: str
    seats: int
    image_url: str
    available: bool

class ProductData(TypedDict):
    name: str
    price: float
    cpu: str
    ram: str
    storage: str
    display: str
    rating: float

class DashboardMetrics(TypedDict):
    totalSales: float
    newCustomers: int
    activeProjects: int
    salesTrend: str
    customerTrend: str
    projectStatus: str

# ============================================================================
# BACKEND DATA FETCHING TOOLS (execute on backend)
# ============================================================================

@tool
def get_revenue_data(period: str = "monthly") -> list[RevenueData]:
    """
    Fetch revenue data from the database.

    Args:
        period: The time period ("monthly", "quarterly", "yearly")

    Returns:
        List of revenue data with month, revenue, and expenses
    """
    # Mock data - in production, fetch from database
    if period == "quarterly":
        return [
            {"month": "Q1", "revenue": 18000, "expenses": 10500},
            {"month": "Q2", "revenue": 21000, "expenses": 12000},
            {"month": "Q3", "revenue": 24000, "expenses": 13500},
            {"month": "Q4", "revenue": 27000, "expenses": 15000},
        ]

    # Default: monthly
    return [
        {"month": "Jan", "revenue": 5000, "expenses": 3000},
        {"month": "Feb", "revenue": 6000, "expenses": 3500},
        {"month": "Mar", "revenue": 7000, "expenses": 4000},
        {"month": "Apr", "revenue": 7500, "expenses": 4200},
        {"month": "May", "revenue": 8000, "expenses": 4500},
        {"month": "Jun", "revenue": 8500, "expenses": 4800},
    ]

@tool
def get_rental_cars(location: str = "San Francisco") -> list[CarData]:
    """
    Fetch available rental cars from the database.

    Args:
        location: City or location for car search

    Returns:
        List of available rental cars with details
    """
    # Mock data - in production, fetch from database or MCP server
    return [
        {
            "id": "car-1",
            "name": "Tesla Model 3",
            "description": "Electric sedan with autopilot and premium interior",
            "price_per_day": 120,
            "type": "Electric",
            "seats": 5,
            "image_url": "https://images.unsplash.com/photo-1560958089-b8a1929cea89?w=400",
            "available": True,
        },
        {
            "id": "car-2",
            "name": "BMW X5",
            "description": "Luxury SUV with advanced safety features",
            "price_per_day": 150,
            "type": "SUV",
            "seats": 7,
            "image_url": "https://images.unsplash.com/photo-1555215695-3004980ad54e?w=400",
            "available": True,
        },
        {
            "id": "car-3",
            "name": "Honda Civic",
            "description": "Reliable and fuel-efficient compact car",
            "price_per_day": 45,
            "type": "Compact",
            "seats": 5,
            "image_url": "https://images.unsplash.com/photo-1590362891991-f776e747a588?w=400",
            "available": True,
        },
        {
            "id": "car-4",
            "name": "Ford Mustang",
            "description": "Iconic sports car with powerful performance",
            "price_per_day": 95,
            "type": "Sports",
            "seats": 4,
            "image_url": "https://images.unsplash.com/photo-1584345604476-8ec5f8f2c8c2?w=400",
            "available": False,
        },
    ]

@tool
def get_laptop_comparison(category: str = "laptops") -> list[ProductData]:
    """
    Fetch product comparison data from the database.

    Args:
        category: Product category to compare

    Returns:
        List of products with specifications
    """
    # Mock data - in production, fetch from database or API
    return [
        {
            "name": "MacBook Pro 16\"",
            "price": 2499,
            "cpu": "M3 Max",
            "ram": "32GB",
            "storage": "1TB SSD",
            "display": "16.2\" Retina",
            "rating": 4.8,
        },
        {
            "name": "Dell XPS 15",
            "price": 1899,
            "cpu": "Intel i9",
            "ram": "32GB",
            "storage": "1TB SSD",
            "display": "15.6\" OLED",
            "rating": 4.6,
        },
        {
            "name": "Lenovo ThinkPad X1",
            "price": 1699,
            "cpu": "Intel i7",
            "ram": "16GB",
            "storage": "512GB SSD",
            "display": "14\" IPS",
            "rating": 4.5,
        },
        {
            "name": "ASUS ROG Zephyrus",
            "price": 2199,
            "cpu": "AMD Ryzen 9",
            "ram": "32GB",
            "storage": "1TB SSD",
            "display": "15.6\" QHD",
            "rating": 4.7,
        },
    ]

@tool
def get_dashboard_metrics(userId: str = "user123") -> DashboardMetrics:
    """
    Fetch dashboard metrics from analytics database.

    Args:
        userId: User ID for personalized metrics

    Returns:
        Dictionary with dashboard metrics
    """
    # Mock data - in production, fetch from analytics database
    return {
        "totalSales": 125000,
        "newCustomers": 234,
        "activeProjects": 12,
        "salesTrend": "+12.5%",
        "customerTrend": "+8.3%",
        "projectStatus": "On Track",
    }

@tool
def get_market_share_data() -> list[dict]:
    """
    Fetch market share data for visualization.

    Returns:
        List of market share data by company
    """
    # Mock data - in production, fetch from market research database
    return [
        {"company": "Company A", "share": 35},
        {"company": "Company B", "share": 28},
        {"company": "Company C", "share": 22},
        {"company": "Company D", "share": 15},
    ]

# ============================================================================
# FRONTEND RENDERING TOOLS (execute on frontend)
# ============================================================================
# CRITICAL: These tools must have NO IMPLEMENTATION (just pass)
# This causes the backend to emit RunPaused events for frontend execution
# ============================================================================

@tool(external_execution=True)
def render_revenue_chart(
    data: list[RevenueData],
    period: str = "monthly",
    chartType: str = "auto"
):
    """
    Render a revenue chart on the frontend.
    Backend must fetch the revenue data first using get_revenue_data and pass it here.

    Args:
        data: Revenue data to render (fetched from get_revenue_data)
        period: Time period for the chart
        chartType: Chart type ("auto", "line", "bar", "trend")
    """
    pass  # No implementation - executes on frontend

@tool(external_execution=True)
def render_rental_cars(data: list[CarData], location: str = "San Francisco"):
    """
    Render rental cars as an interactive card grid on the frontend.
    Backend must fetch car data first using get_rental_cars and pass it here.

    Args:
        data: Car data to render (fetched from get_rental_cars)
        location: Location where cars are available
    """
    pass  # No implementation - executes on frontend

@tool(external_execution=True)
def render_product_comparison(data: list[ProductData], category: str = "products"):
    """
    Render product comparison table on the frontend.
    Backend must fetch product data first using get_laptop_comparison and pass it here.

    Args:
        data: Product data to render (fetched from get_laptop_comparison)
        category: Product category being compared
    """
    pass  # No implementation - executes on frontend

@tool(external_execution=True)
def render_dashboard(data: DashboardMetrics, userId: str = None):
    """
    Render a dashboard with key metrics on the frontend.
    Backend must fetch metrics first using get_dashboard_metrics and pass it here.

    Args:
        data: Dashboard metrics to render (fetched from get_dashboard_metrics)
        userId: Optional user ID for personalization
    """
    pass  # No implementation - executes on frontend

@tool(external_execution=True)
def render_visualization(data: list[dict], query: str = "Data", chartType: str = None):
    """
    Render data visualization with smart chart type detection on the frontend.
    Backend must fetch data first and pass it here.

    Args:
        data: Data to visualize
        query: Description of what's being visualized
        chartType: Optional chart type hint ("pie", "line", "bar")
    """
    pass  # No implementation - executes on frontend

@tool(external_execution=True)
def show_alert(content: str):
    """
    Show an alert message on the frontend.

    Args:
        content: The alert message to display
    """
    pass  # No implementation - executes on frontend

# ============================================================================
# AGENT CONFIGURATION
# ============================================================================

assistant = Agent(
    name="generative-ui-demo",
    db=db,
    tools=[
        # Backend data fetching tools
        get_revenue_data,
        get_rental_cars,
        get_laptop_comparison,
        get_dashboard_metrics,
        get_market_share_data,

        # Frontend rendering tools
        render_revenue_chart,
        render_rental_cars,
        render_product_comparison,
        render_dashboard,
        render_visualization,
        show_alert,
    ],
    model=Claude(id="claude-sonnet-4-5"),
    description="AI assistant that demonstrates generative UI capabilities with interactive charts, cards, tables, and visualizations.",
    instructions=[
        "You are a helpful AI assistant that creates beautiful, interactive visualizations.",
        "",
        "CRITICAL WORKFLOW:",
        "1. When user asks for data visualization, FIRST fetch the data using the appropriate get_* tool",
        "2. THEN pass that data to the appropriate render_* tool for frontend display",
        "",
        "Examples:",
        "- User: 'Show revenue' → call get_revenue_data() → call render_revenue_chart(data=result)",
        "- User: 'Show rental cars' → call get_rental_cars() → call render_rental_cars(data=result)",
        "- User: 'Compare laptops' → call get_laptop_comparison() → call render_product_comparison(data=result)",
        "- User: 'Show my dashboard' → call get_dashboard_metrics() → call render_dashboard(data=result)",
        "- User: 'Visualize market share' → call get_market_share_data() → call render_visualization(data=result, chartType='pie')",
        "",
        "The render_* tools execute on the FRONTEND and create interactive UI components.",
        "Always explain what you're showing and offer to adjust the visualization.",
    ],
    add_history_to_context=True,
    markdown=True,
    debug_mode=True,
    debug_level=2,
)

agent_os = AgentOS(
    id="generative-ui-demo",
    description="Demo of generative UI capabilities with interactive visualizations",
    agents=[assistant],
)

app = agent_os.get_app()

if __name__ == "__main__":
    print("\n" + "="*70)
    print("🎨 Generative UI Demo Agent")
    print("="*70)
    print("\nThis agent demonstrates all generative UI capabilities:")
    print("  • Revenue charts (bar/line)")
    print("  • Rental car cards")
    print("  • Product comparison tables")
    print("  • Dashboard metrics")
    print("  • Smart data visualization")
    print("\nStarting server on http://localhost:7777")
    print("\nExample prompts to try:")
    print("  • 'Show me monthly revenue'")
    print("  • 'What rental cars are available?'")
    print("  • 'Compare laptops'")
    print("  • 'Show my dashboard'")
    print("  • 'Visualize market share data'")
    print("\n" + "="*70 + "\n")

    # Default port is 7777; change with port=...
    agent_os.serve(app="examples.mock-agent:app", reload=True)
