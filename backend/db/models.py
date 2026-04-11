from sqlalchemy import String, Boolean, Numeric, Text, Date, SmallInteger, ForeignKey
from sqlalchemy.dialects.postgresql import JSONB, TIMESTAMPTZ
from sqlalchemy.orm import relationship, Mapped, mapped_column
from pgvector.sqlalchemy import Vector
from typing import Optional
from datetime import date, datetime
from .database import Base


class Notice(Base):
    __tablename__ = "notices"

    id:                   Mapped[int]            = mapped_column(primary_key=True)
    bid_ntce_no:          Mapped[str]            = mapped_column(String(40))
    bid_ntce_ord:         Mapped[str]            = mapped_column(String(10), default="00")
    notice_type:          Mapped[str]            = mapped_column(String(10))
    bid_ntce_nm:          Mapped[str]            = mapped_column(String(500))
    ntce_instt_nm:        Mapped[Optional[str]]  = mapped_column(String(200), nullable=True)
    dminstt_nm:           Mapped[Optional[str]]  = mapped_column(String(200), nullable=True)
    bid_mtd_nm:           Mapped[Optional[str]]  = mapped_column(String(100), nullable=True)
    cntrct_cncls_mthd_nm: Mapped[Optional[str]]  = mapped_column(String(100), nullable=True)
    is_isp_ismp:          Mapped[bool]           = mapped_column(Boolean, default=False)
    isp_ismp_type:        Mapped[Optional[str]]  = mapped_column(String(10), nullable=True)
    asign_bdgt_amt:       Mapped[Optional[float]]= mapped_column(Numeric(18, 2), nullable=True)
    presmpt_prce:         Mapped[Optional[float]]= mapped_column(Numeric(18, 2), nullable=True)
    bid_clse_dt:          Mapped[Optional[datetime]] = mapped_column(TIMESTAMPTZ, nullable=True)
    bid_ntce_dt:          Mapped[Optional[datetime]] = mapped_column(TIMESTAMPTZ, nullable=True)
    ntce_end_dt:          Mapped[Optional[datetime]] = mapped_column(TIMESTAMPTZ, nullable=True)
    openg_dt:             Mapped[Optional[datetime]] = mapped_column(TIMESTAMPTZ, nullable=True)
    exec_term_start_dt:   Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    exec_term_end_dt:     Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    bid_ntce_dtl_url:     Mapped[Optional[str]]  = mapped_column(Text, nullable=True)
    attach_file_url:      Mapped[Optional[str]]  = mapped_column(Text, nullable=True)
    raw_file_path:        Mapped[Optional[str]]  = mapped_column(Text, nullable=True)
    raw_file_ext:         Mapped[Optional[str]]  = mapped_column(String(10), nullable=True)
    pipeline_status:      Mapped[str]            = mapped_column(String(20), default="collected")
    parse_error_msg:      Mapped[Optional[str]]  = mapped_column(Text, nullable=True)
    content_embedding:    Mapped[Optional[list]] = mapped_column(Vector(1536), nullable=True)
    collected_at:         Mapped[Optional[datetime]] = mapped_column(TIMESTAMPTZ, nullable=True)
    updated_at:           Mapped[Optional[datetime]] = mapped_column(TIMESTAMPTZ, nullable=True)

    analysis_result:   Mapped["AnalysisResult"]        = relationship("AnalysisResult", back_populates="notice", uselist=False)
    risk_factors:      Mapped[list["RiskFactor"]]      = relationship("RiskFactor", back_populates="notice")
    proposal_outlines: Mapped[list["ProposalOutline"]] = relationship("ProposalOutline", back_populates="notice")


class AnalysisResult(Base):
    __tablename__ = "analysis_results"

    id:                  Mapped[int]            = mapped_column(primary_key=True)
    notice_id:           Mapped[int]            = mapped_column(ForeignKey("notices.id", ondelete="CASCADE"), unique=True)
    budget_amt:          Mapped[Optional[float]]= mapped_column(Numeric(18, 2), nullable=True)
    budget_raw:          Mapped[Optional[str]]  = mapped_column(Text, nullable=True)
    bid_qualify:         Mapped[Optional[str]]  = mapped_column(Text, nullable=True)
    exec_period_months:  Mapped[Optional[int]]  = mapped_column(nullable=True)
    exec_period_raw:     Mapped[Optional[str]]  = mapped_column(Text, nullable=True)
    manmonth_total:      Mapped[Optional[float]]= mapped_column(Numeric(8, 2), nullable=True)
    manmonth_detail:     Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    past_performance:    Mapped[Optional[str]]  = mapped_column(Text, nullable=True)
    eval_tech_score:     Mapped[Optional[float]]= mapped_column(Numeric(5, 2), nullable=True)
    eval_price_score:    Mapped[Optional[float]]= mapped_column(Numeric(5, 2), nullable=True)
    task_scope:          Mapped[Optional[str]]  = mapped_column(Text, nullable=True)
    joint_supply_yn:     Mapped[Optional[bool]] = mapped_column(nullable=True)
    joint_supply_detail: Mapped[Optional[str]]  = mapped_column(Text, nullable=True)
    submit_deadline:     Mapped[Optional[datetime]] = mapped_column(TIMESTAMPTZ, nullable=True)
    required_docs:       Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    exec_location:       Mapped[Optional[str]]  = mapped_column(Text, nullable=True)
    key_tech_spec:       Mapped[Optional[str]]  = mapped_column(Text, nullable=True)
    disqualify_reason:   Mapped[Optional[str]]  = mapped_column(Text, nullable=True)
    contact_person:      Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    confidence_score:    Mapped[Optional[float]]= mapped_column(Numeric(4, 3), nullable=True)
    model_used:          Mapped[Optional[str]]  = mapped_column(String(50), nullable=True)
    prompt_version:      Mapped[Optional[str]]  = mapped_column(String(20), nullable=True)
    analyzed_at:         Mapped[Optional[datetime]] = mapped_column(TIMESTAMPTZ, nullable=True)
    updated_at:          Mapped[Optional[datetime]] = mapped_column(TIMESTAMPTZ, nullable=True)

    notice: Mapped["Notice"] = relationship("Notice", back_populates="analysis_result")


class RiskFactor(Base):
    __tablename__ = "risk_factors"

    id:                  Mapped[int]           = mapped_column(primary_key=True)
    notice_id:           Mapped[int]           = mapped_column(ForeignKey("notices.id", ondelete="CASCADE"))
    risk_category:       Mapped[str]           = mapped_column(String(50))
    risk_level:          Mapped[str]           = mapped_column(String(10), default="medium")
    clause_title:        Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    clause_original:     Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    clause_summary:      Mapped[str]           = mapped_column(Text)
    page_no:             Mapped[Optional[int]] = mapped_column(nullable=True)
    mitigation_suggest:  Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    sort_order:          Mapped[int]           = mapped_column(default=0)
    created_at:          Mapped[Optional[datetime]] = mapped_column(TIMESTAMPTZ, nullable=True)

    notice: Mapped["Notice"] = relationship("Notice", back_populates="risk_factors")


class ProposalOutline(Base):
    __tablename__ = "proposal_outlines"

    id:                    Mapped[int]           = mapped_column(primary_key=True)
    notice_id:             Mapped[int]           = mapped_column(ForeignKey("notices.id", ondelete="CASCADE"))
    outline_version:       Mapped[int]           = mapped_column(default=1)
    guideline_base:        Mapped[str]           = mapped_column(String(20), default="MOIS_ISP")
    total_pages_estimate:  Mapped[Optional[int]] = mapped_column(nullable=True)
    model_used:            Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    prompt_version:        Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    generated_at:          Mapped[Optional[datetime]] = mapped_column(TIMESTAMPTZ, nullable=True)
    is_active:             Mapped[bool]          = mapped_column(Boolean, default=True)

    notice:   Mapped["Notice"]               = relationship("Notice", back_populates="proposal_outlines")
    sections: Mapped[list["ProposalSection"]]= relationship("ProposalSection", back_populates="outline")


class ProposalSection(Base):
    __tablename__ = "proposal_sections"

    id:             Mapped[int]           = mapped_column(primary_key=True)
    outline_id:     Mapped[int]           = mapped_column(ForeignKey("proposal_outlines.id", ondelete="CASCADE"))
    level:          Mapped[int]           = mapped_column(SmallInteger)
    parent_id:      Mapped[Optional[int]] = mapped_column(ForeignKey("proposal_sections.id", ondelete="CASCADE"), nullable=True)
    sort_order:     Mapped[int]           = mapped_column(default=0)
    section_no:     Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    section_title:  Mapped[str]           = mapped_column(String(300))
    section_desc:   Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    pages_estimate: Mapped[Optional[int]] = mapped_column(nullable=True)
    is_mandatory:   Mapped[bool]          = mapped_column(Boolean, default=True)

    outline:  Mapped["ProposalOutline"]       = relationship("ProposalOutline", back_populates="sections")
    children: Mapped[list["ProposalSection"]] = relationship("ProposalSection")
