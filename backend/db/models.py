from sqlalchemy import (
    Column,
    Integer,
    String,
    Boolean,
    Numeric,
    Text,
    Date,
    SmallInteger,
    ForeignKey,
)
from sqlalchemy.dialects.postgresql import JSONB, TIMESTAMP
from sqlalchemy.orm import relationship
from pgvector.sqlalchemy import Vector
from .database import Base


class Notice(Base):
    __tablename__ = "notices"

    id                   = Column(Integer, primary_key=True)
    bid_ntce_no          = Column(String(40), nullable=False)
    bid_ntce_ord         = Column(String(10), nullable=False, default="00")
    notice_type          = Column(String(10), nullable=False)
    bid_ntce_nm          = Column(String(500), nullable=False)
    ntce_instt_nm        = Column(String(200))
    dminstt_nm           = Column(String(200))
    bid_mtd_nm           = Column(String(100))
    cntrct_cncls_mthd_nm = Column(String(100))
    is_isp_ismp          = Column(Boolean, nullable=False, default=False)
    isp_ismp_type        = Column(String(10))
    asign_bdgt_amt       = Column(Numeric(18, 2))
    pre_asign_amt        = Column(Numeric(18, 2))
    bid_clse_dt          = Column(TIMESTAMP(timezone=True))
    ntce_bgn_dt          = Column(TIMESTAMP(timezone=True))
    ntce_end_dt          = Column(TIMESTAMP(timezone=True))
    openg_dt             = Column(TIMESTAMP(timezone=True))
    exec_term_start_dt   = Column(Date)
    exec_term_end_dt     = Column(Date)
    bid_ntce_dtl_url     = Column(Text)
    attach_file_url      = Column(Text)
    raw_file_path        = Column(Text)
    raw_file_ext         = Column(String(10))
    pipeline_status      = Column(String(20), nullable=False, default="collected")
    parse_error_msg      = Column(Text)
    content_embedding    = Column(Vector(1536))
    collected_at         = Column(TIMESTAMP(timezone=True))
    updated_at           = Column(TIMESTAMP(timezone=True))

    analysis_result   = relationship("AnalysisResult", back_populates="notice", uselist=False)
    risk_factors      = relationship("RiskFactor", back_populates="notice")
    proposal_outlines = relationship("ProposalOutline", back_populates="notice")


class AnalysisResult(Base):
    __tablename__ = "analysis_results"

    id                  = Column(Integer, primary_key=True)
    notice_id           = Column(Integer, ForeignKey("notices.id", ondelete="CASCADE"), nullable=False, unique=True)
    budget_amt          = Column(Numeric(18, 2))
    budget_raw          = Column(Text)
    bid_qualify         = Column(Text)
    exec_period_months  = Column(Integer)
    exec_period_raw     = Column(Text)
    manmonth_total      = Column(Numeric(8, 2))
    manmonth_detail     = Column(JSONB)
    past_performance    = Column(Text)
    eval_tech_score     = Column(Numeric(5, 2))
    eval_price_score    = Column(Numeric(5, 2))
    task_scope          = Column(Text)
    joint_supply_yn     = Column(Boolean)
    joint_supply_detail = Column(Text)
    submit_deadline     = Column(TIMESTAMP(timezone=True))
    required_docs       = Column(JSONB)
    exec_location       = Column(Text)
    key_tech_spec       = Column(Text)
    disqualify_reason   = Column(Text)
    contact_person      = Column(JSONB)
    confidence_score    = Column(Numeric(4, 3))
    model_used          = Column(String(50))
    prompt_version      = Column(String(20))
    analyzed_at         = Column(TIMESTAMP(timezone=True))
    updated_at          = Column(TIMESTAMP(timezone=True))

    notice = relationship("Notice", back_populates="analysis_result")


class RiskFactor(Base):
    __tablename__ = "risk_factors"

    id                 = Column(Integer, primary_key=True)
    notice_id          = Column(Integer, ForeignKey("notices.id", ondelete="CASCADE"), nullable=False)
    risk_category      = Column(String(50), nullable=False)
    risk_level         = Column(String(10), nullable=False, default="medium")
    clause_title       = Column(String(200))
    clause_original    = Column(Text)
    clause_summary     = Column(Text, nullable=False)
    page_no            = Column(Integer)
    mitigation_suggest = Column(Text)
    sort_order         = Column(Integer, nullable=False, default=0)
    created_at         = Column(TIMESTAMP(timezone=True))

    notice = relationship("Notice", back_populates="risk_factors")


class ProposalOutline(Base):
    __tablename__ = "proposal_outlines"

    id                   = Column(Integer, primary_key=True)
    notice_id            = Column(Integer, ForeignKey("notices.id", ondelete="CASCADE"), nullable=False)
    outline_version      = Column(Integer, nullable=False, default=1)
    guideline_base       = Column(String(20), nullable=False, default="MOIS_ISP")
    total_pages_estimate = Column(Integer)
    model_used           = Column(String(50))
    prompt_version       = Column(String(20))
    generated_at         = Column(TIMESTAMP(timezone=True))
    is_active            = Column(Boolean, nullable=False, default=True)

    notice   = relationship("Notice", back_populates="proposal_outlines")
    sections = relationship("ProposalSection", back_populates="outline")


class ProposalSection(Base):
    __tablename__ = "proposal_sections"

    id             = Column(Integer, primary_key=True)
    outline_id     = Column(Integer, ForeignKey("proposal_outlines.id", ondelete="CASCADE"), nullable=False)
    level          = Column(SmallInteger, nullable=False)
    parent_id      = Column(Integer, ForeignKey("proposal_sections.id", ondelete="CASCADE"))
    sort_order     = Column(Integer, nullable=False, default=0)
    section_no     = Column(String(20))
    section_title  = Column(String(300), nullable=False)
    section_desc   = Column(Text)
    pages_estimate = Column(Integer)
    is_mandatory   = Column(Boolean, nullable=False, default=True)

    outline  = relationship("ProposalOutline", back_populates="sections")
    children = relationship("ProposalSection")
